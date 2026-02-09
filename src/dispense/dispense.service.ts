import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DispenseRepo } from './dispense.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DispenseService {
  constructor(
    private readonly dispenseRepo: DispenseRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}
  private logger = new Logger('DispenseService');

  async findAll() {
    return await this.dispenseRepo.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        dispenseItems: {
          include: {
            drug: {
              include: {
                drugType: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.dispenseRepo.findFirst({
      where: { id },
      include: {
        dispenseItems: {
          include: {
            drug: true,
          },
        },
      },
    });
  }

  // ✅ 1. Create (Pending): สร้างใบจ่ายยา + ตัดสต็อก FEFO -> แจ้ง Admin
  async create(data: Prisma.DispenseCreateInput) {
    // ---------------------------------------------------------
    // ส่วนที่ 1: Transaction (บันทึกข้อมูล + ตัดสต็อก FEFO)
    // ---------------------------------------------------------
    // ⚠️ แก้ไข: เอาผลลัพธ์ใส่ตัวแปร result ก่อน อย่าเพิ่ง return
    const result = await this.prisma.$transaction(async (tx) => {
      // 1.1 สร้างใบจ่ายยา (Header)
      const newDispense = await tx.dispense.create({
        data: {
          ...data,
          dispenseItems: undefined, // เราจะสร้าง Item เองข้างล่าง
        },
      });

      // ดึงรายการยาที่ส่งมาจาก Frontend
      const itemsInput = (data.dispenseItems as any)?.create || [];

      // 1.2 วนลูปตัดสต็อกทีละรายการ
      for (const itemInput of itemsInput) {
        const drugId = itemInput.drugId;
        let qtyNeeded = itemInput.quantity;
        const price = itemInput.price;

        // A. เช็คยอดรวมก่อนว่าพอไหม (Master Stock)
        const drugMaster = await tx.drug.findUnique({ where: { id: drugId } });
        if (!drugMaster || drugMaster.quantity < qtyNeeded) {
          throw new ConflictException(
            `ยา ${drugMaster?.name || drugId} มีของไม่พอ (ขาด ${
              qtyNeeded - (drugMaster?.quantity || 0)
            })`,
          );
        }

        // B. ดึง Lot ที่มีของ โดยเรียงตามวันหมดอายุ (FEFO Logic) 🟢
        const lots = await tx.drugLot.findMany({
          where: {
            drugId: drugId,
            quantity: { gt: 0 }, // เอาเฉพาะที่มีของ
            isActive: true,
          },
          orderBy: { expiryDate: 'asc' }, // เรียงวันหมดอายุ น้อย -> มาก
        });

        let currentLotIndex = 0;

        // C. ตัดสต็อกตาม Lot
        while (qtyNeeded > 0) {
          if (currentLotIndex >= lots.length) {
            // กรณี Data Inconsistency (Master บอกมี แต่ Lot ไม่มี)
            throw new ConflictException(
              `ยา ${drugMaster.name} ข้อมูลสต็อก Lot ไม่ถูกต้อง (หาย)`,
            );
          }

          const lot = lots[currentLotIndex];
          const deductAmount = Math.min(lot.quantity, qtyNeeded); // ตัดเท่าที่มี หรือเท่าที่ต้องการ

          // อัปเดต Lot
          await tx.drugLot.update({
            where: { id: lot.id },
            data: {
              quantity: { decrement: deductAmount },
              // ถ้าหมดเกลี้ยง ปิด Active ไปเลยก็ได้
              isActive: lot.quantity - deductAmount > 0,
            },
          });

          qtyNeeded -= deductAmount;
          currentLotIndex++;
        }

        // D. สร้าง DispenseItem บันทึกประวัติ
        await tx.dispenseItem.create({
          data: {
            dispenseId: newDispense.id,
            drugId: drugId,
            quantity: itemInput.quantity,
            price: price, // ราคาขาย
          },
        });

        // E. อัปเดตยอดรวม Master Drug
        await tx.drug.update({
          where: { id: drugId },
          data: { quantity: { decrement: itemInput.quantity } },
        });
      }

      return newDispense;
    });

    // ---------------------------------------------------------
    // ส่วนที่ 2: Notification (แจ้งเตือนหลังจาก Transaction สำเร็จ)
    // ---------------------------------------------------------
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const adminIds = admins.map((u) => u.userId);

      if (adminIds.length > 0) {
        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageDrug', // 🔔 เมนู Admin
          title: '💊 มีรายการจ่ายยาใหม่',
          message: `รายการ ID: ${result.id} (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: result.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    // ✅ ค่อย return ผลลัพธ์กลับไป
    return result;
  }

  // ✅ 2. Update: แก้ไขข้อมูลทั่วไป
  async update(id: number, data: Prisma.DispenseUpdateInput) {
    const oldData = await this.dispenseRepo.findFirst({ where: { id } });
    const updatedResult = await this.dispenseRepo.update({
      where: { id },
      data,
    });

    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData?.status
    ) {
      this.handleStatusNotification(updatedResult, data.status as string);
    }

    return updatedResult;
  }

  // ✅ 3. Edit: แก้ไขสถานะ
  async editDispense(id: number, payload: any) {
    const updateData = { ...payload };
    delete updateData.id;

    const oldData = await this.dispenseRepo.findFirst({ where: { id } });
    const result = await this.dispenseRepo.edit(id, updateData);

    if (payload.status && payload.status !== oldData?.status) {
      this.handleStatusNotification(result, payload.status);
    }

    return result;
  }

  // ✅ 4. Delete: เคลียร์แจ้งเตือน
  async delete(id: number) {
    try {
      const notificationsToCheck = await this.prisma.notification.findMany({
        where: {
          menuKey: { in: ['maDrug', 'manageDrug'] },
        },
      });

      const idsToDelete = notificationsToCheck
        .filter((n) => (n.meta as any)?.documentId === id)
        .map((n) => n.id);

      if (idsToDelete.length > 0) {
        await this.prisma.notification.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup notifications', error);
    }

    return await this.dispenseRepo.delete(id);
  }

  // ✅ 5. Execute: ดำเนินการจ่ายยา (Completed)
  async execute(id: number, payload: any) {
    const result = await this.dispenseRepo.executeDispense(id, payload);
    this.handleStatusNotification(result, 'completed');
    return result;
  }

  // ✅ 6. Helper Function: แยกการแจ้งเตือนตาม Role
  private async handleStatusNotification(dispenseData: any, newStatus: string) {
    try {
      const dispenseId = dispenseData.id;
      const dispenserName = dispenseData.dispenserName || 'เจ้าหน้าที่';

      // =========================================================
      // กลุ่มที่ 1: Approved / Canceled -> แจ้ง PHARMACY
      // =========================================================
      if (['approved', 'canceled'].includes(newStatus)) {
        let title = '';
        let message = '';
        let type = 'info';

        switch (newStatus) {
          case 'approved':
            title = '✅ รายการจ่ายยาอนุมัติแล้ว';
            message = `รายการ ID: ${dispenseId} อนุมัติแล้ว พร้อมดำเนินการ`;
            type = 'success';
            break;
          case 'canceled':
            title = '❌ รายการจ่ายยาถูกยกเลิก';
            message = `รายการ ID: ${dispenseId} ถูกยกเลิก`;
            type = 'error';
            break;
        }

        const pharmacies = await this.prisma.user.findMany({
          where: { role: 'pharmacy' },
          select: { userId: true },
        });
        const pharmacyIds = pharmacies.map((u) => u.userId);

        if (pharmacyIds.length > 0) {
          await this.notiService.createNotification({
            userId: pharmacyIds,
            menuKey: 'maDrug',
            title,
            message,
            type,
            meta: { documentId: dispenseId },
          });
        }
      }
      // =========================================================
      // กลุ่มที่ 2: Completed / Pending -> แจ้ง ADMIN
      // =========================================================
      else if (['completed', 'pending'].includes(newStatus)) {
        const admins = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { userId: true },
        });
        const adminIds = admins.map((u) => u.userId);

        if (adminIds.length > 0) {
          let title = '';
          let message = '';
          let type = 'info';

          if (newStatus === 'completed') {
            title = '✨ จ่ายยาสำเร็จ';
            message = `รายการ ID: ${dispenseId} ดำเนินการเรียบร้อยแล้ว (ปิดงาน)`;
            type = 'success';
          } else if (newStatus === 'pending') {
            title = '📝 มีการแก้ไขรายการจ่ายยา';
            message = `รายการ ID: ${dispenseId} โดย ${dispenserName} มีการแก้ไขข้อมูล`;
            type = 'info';
          }

          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'manageDrug',
            title,
            message,
            type,
            meta: { documentId: dispenseId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle status notification', error);
    }
  }
}
