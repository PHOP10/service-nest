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

  // 🟢 1. Create (Pending): สร้างใบจ่ายยาเท่านั้น (⛔ ยังไม่ตัดสต็อกที่นี่) -> แจ้ง Admin
  async create(data: Prisma.DispenseCreateInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. สร้างแค่ Header ของใบจ่ายยา
      const newDispense = await tx.dispense.create({
        data: {
          ...data,
          dispenseItems: undefined, // เราจะแยกสร้าง Items ด้านล่าง
        },
      });

      // 2. ดึงข้อมูล Items
      const itemsInput = (data.dispenseItems as any)?.create || [];

      // 3. วนลูปเช็คว่าของพอไหม และบันทึกแค่ประวัติ (แต่ยังไม่หักสต็อก)
      for (const itemInput of itemsInput) {
        const drugId = itemInput.drugId;
        const qtyNeeded = itemInput.quantity;
        const price = itemInput.price;

        // เช็คว่ายาใน Master มีพอให้จองไหม (ถ้าไม่พอก็บล็อกเลย)
        const drugMaster = await tx.drug.findUnique({ where: { id: drugId } });
        if (!drugMaster || drugMaster.quantity < qtyNeeded) {
          throw new ConflictException(
            `ยา ${drugMaster?.name || drugId} มีของไม่พอ (เหลือแค่ ${
              drugMaster?.quantity || 0
            })`,
          );
        }

        // ⛔ ลบโค้ดตัดสต็อก FEFO และ ลบโค้ดหัก Master Drug ออกจากตรงนี้ทั้งหมด ⛔

        // บันทึกรายการ DispenseItem ไว้เฉยๆ รอแอดมินมายืนยัน
        await tx.dispenseItem.create({
          data: {
            dispenseId: newDispense.id,
            drugId: drugId,
            quantity: qtyNeeded,
            price: price,
          },
        });
      }

      return newDispense;
    });

    // 4. ส่งแจ้งเตือนหาแอดมิน
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const adminIds = admins.map((u) => u.userId);

      if (adminIds.length > 0) {
        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageDrug',
          title: '💊 มีรายการจ่ายยาใหม่',
          message: `รายการ ID: ${result.id} (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: result.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

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
      await this.handleStatusNotification(updatedResult, data.status as string);
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
      await this.handleStatusNotification(result, payload.status);
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

  // ✅ 5. Execute: ดำเนินการจ่ายยา และตัดสต็อกจริงๆ ตรงนี้ (Completed)
  async execute(id: number, payload: any) {
    // โยนไปให้ dispense.repo เป็นคนจัดการตัดสต็อกและบันทึกข้อมูล
    const result = await this.dispenseRepo.executeDispense(id, payload);

    // พอตัดสต็อกเสร็จก็ส่งแจ้งเตือน
    await this.handleStatusNotification(result, 'completed');

    return result;
  }

  // =================================================================================
  // 🔔 6. Helper Function: แยกการแจ้งเตือน
  // =================================================================================
  private async handleStatusNotification(requestData: any, newStatus: string) {
    try {
      const requestId = requestData.id;
      // ⚠️ แก้ชื่อตัวแปรให้ตรงกับ Model Dispense
      const reqNo = requestData.id || '-';
      const requesterName = requestData.dispenserName || 'เจ้าหน้าที่';
      const creatorUserId = requestData.createdById;

      // 🟢 1. อนุมัติ / ยกเลิก -> แจ้งเตือนไปยัง "ผู้เบิกยา" คนเดียวเท่านั้น
      if (['approve', 'approved', 'cancel'].includes(newStatus)) {
        if (!creatorUserId) return;

        const isApprove = newStatus === 'approve' || newStatus === 'approved';
        const title = isApprove
          ? '✅ ใบเบิกยาอนุมัติแล้ว'
          : '❌ ใบเบิกยาถูกยกเลิก';
        const message = isApprove
          ? `รายการ ID: ${reqNo} อนุมัติแล้ว (เตรียมรับยา)`
          : `รายการ ID: ${reqNo} ถูกยกเลิก`;
        const type = isApprove ? 'success' : 'error';

        await this.notiService.clearOpenNotifications(
          creatorUserId,
          'maDrug',
          requestId,
        );
        await this.notiService.createNotification({
          userId: creatorUserId,
          menuKey: 'maDrug',
          title,
          message,
          type,
          meta: { documentId: requestId },
        });
      }

      // 🟢 2. รับยาเข้าคลัง (completed) และ แก้ไข (pending) -> แจ้งเตือนแอดมินอย่างเดียว
      else if (['completed', 'pending'].includes(newStatus)) {
        const admins = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { userId: true },
        });
        const adminIds = admins.map((u) => u.userId);

        if (adminIds.length > 0) {
          const title =
            newStatus === 'completed'
              ? '✨ ยืนยันการรับยาแล้ว'
              : '📝 มีการแก้ไขใบเบิกยา';
          const message =
            newStatus === 'completed'
              ? `รายการ ID: ${reqNo} ได้รับยาเรียบร้อยแล้ว (ปิดงาน)`
              : `รายการ ID: ${reqNo} โดยคุณ ${requesterName} มีการแก้ไขข้อมูล รอตรวจสอบ`;
          const type = newStatus === 'completed' ? 'success' : 'info';

          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'manageDrug',
            title,
            message,
            type,
            meta: { documentId: requestId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle status notification', error);
    }
  }
}
