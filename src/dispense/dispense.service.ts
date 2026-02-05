import { Injectable, Logger } from '@nestjs/common';
import { DispenseRepo } from './dispense.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // ✅ Import
import { NotificationsService } from '../notifications/notifications.service'; // ✅ Import

@Injectable()
export class DispenseService {
  constructor(
    private readonly dispenseRepo: DispenseRepo,
    private readonly prisma: PrismaService, // ✅ Inject
    private readonly notiService: NotificationsService, // ✅ Inject
  ) {}
  private logger = new Logger('DispenseService');

  async findAll() {
    return await this.dispenseRepo.findMany({
      orderBy: { id: 'desc' },
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

  // ✅ 1. Create (Pending): สร้างใบจ่ายยา -> แจ้ง Admin
  async create(data: Prisma.DispenseCreateInput) {
    const newDispense = await this.dispenseRepo.create(data);

    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const adminIds = admins.map((u) => u.userId);

      if (adminIds.length > 0) {
        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageDrug', // 🔔 เมนู Admin (จัดการเบิกจ่ายยา)
          title: '💊 มีรายการจ่ายยาใหม่',
          message: `รายการ ID: ${newDispense.id} (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: newDispense.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newDispense;
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
          menuKey: { in: ['maDrug', 'manageDrug'] }, // เช็คทั้ง 2 เมนูที่เกี่ยวข้อง
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

  // ✅ 5. Execute: ดำเนินการจ่ายยา (Completed) -> แจ้ง Admin
  async execute(id: number, payload: any) {
    const result = await this.dispenseRepo.executeDispense(id, payload);
    // แจ้งเตือน Admin ว่าจ่ายยาสำเร็จแล้ว
    this.handleStatusNotification(result, 'completed');
    return result;
  }

  // ✅ 6. Helper Function: แยกการแจ้งเตือนตาม Role
  private async handleStatusNotification(dispenseData: any, newStatus: string) {
    try {
      const dispenseId = dispenseData.id;
      // เนื่องจาก Model ไม่มี createdById เราจะใช้ dispenserName แสดงผลแทน
      const dispenserName = dispenseData.dispenserName || 'เจ้าหน้าที่';

      // =========================================================
      // กลุ่มที่ 1: Approved / Canceled -> แจ้ง PHARMACY (ห้องยา)
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

        // หา User ที่เป็น Role Pharmacy ทั้งหมด
        const pharmacies = await this.prisma.user.findMany({
          where: { role: 'pharmacy' },
          select: { userId: true },
        });
        const pharmacyIds = pharmacies.map((u) => u.userId);

        if (pharmacyIds.length > 0) {
          await this.notiService.createNotification({
            userId: pharmacyIds,
            menuKey: 'maDrug', // 🔔 เมนู Pharmacy (เบิกจ่ายยา)
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
            menuKey: 'manageDrug', // 🔔 เมนู Admin (จัดการเบิกจ่ายยา)
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
