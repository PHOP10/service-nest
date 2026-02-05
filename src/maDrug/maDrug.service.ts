import { Injectable, Logger } from '@nestjs/common';
import { MaDrugRepo } from './maDrug.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MaDrugService {
  constructor(
    private readonly maDrugRepo: MaDrugRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}
  private logger = new Logger('MaDrugService');

  async findAll() {
    return await this.maDrugRepo.findMany({
      include: {
        maDrugItems: {
          include: {
            drug: {
              include: { drugType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return await this.maDrugRepo.findOne(id);
  }

  // ✅ 1. Create (Pending): Pharmacy เบิก -> แจ้ง Admin
  async create(data: Prisma.MaDrugCreateInput) {
    const newRequest = await this.maDrugRepo.create(data);

    try {
      // แจ้ง Admin เท่านั้น
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const adminIds = admins.map((u) => u.userId);

      if (adminIds.length > 0) {
        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageDrug', // 🔔 เมนู Admin
          title: '💊 มีการเบิกยารายการใหม่',
          message: `ใบเบิกเลขที่: ${
            newRequest.requestNumber || '-'
          } (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: newRequest.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newRequest;
  }

  // ✅ 2. Update: แก้ไขข้อมูลทั่วไป
  async update(id: number, data: Prisma.MaDrugUpdateInput) {
    const oldData = await this.maDrugRepo.findOne(id);
    const updatedResult = await this.maDrugRepo.update({
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

  // ✅ 3. Delete: เคลียร์แจ้งเตือน
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

    return await this.maDrugRepo.delete(id);
  }

  // ✅ 4. Receive: รับยา (Completed) -> แจ้ง Admin
  async receiveMaDrug(id: number, payload: any) {
    const result = await this.maDrugRepo.receiveMaDrugWithTransaction(
      id,
      payload,
    );
    // แจ้งเตือน Admin ว่ารับยาแล้ว
    this.handleStatusNotification(result, 'completed');
    return result;
  }

  // ✅ 5. Edit: แก้ไขสถานะ
  async editMaDrug(id: number, payload: any) {
    const updateData = { ...payload };
    delete updateData.id;

    const oldData = await this.maDrugRepo.findOne(id);
    const result = await this.maDrugRepo.edit(id, updateData);

    if (payload.status && payload.status !== oldData?.status) {
      this.handleStatusNotification(result, payload.status);
    }

    return result;
  }

  // ✅ 6. Helper Function: แยกการแจ้งเตือนตาม Role
  private async handleStatusNotification(requestData: any, newStatus: string) {
    try {
      // ⚠️ จำเป็นต้องมี createdById เพื่อแจ้งกลับหา Pharmacy คนนั้น
      // ถ้าใน Model ไม่มี ให้ลองใช้ logic แจ้งเตือนตาม Role 'pharmacy' แทน
      const requesterId = (requestData as any).createdById;
      const requestId = requestData.id;
      const reqNo = requestData.requestNumber || '-';
      const requesterName = requestData.createdName || 'ห้องยา';

      // =========================================================
      // กลุ่มที่ 1: Approved / Cancel -> แจ้ง PHARMACY (User)
      // =========================================================
      if (['approved', 'cancel'].includes(newStatus)) {
        let title = '';
        let message = '';
        let type = 'info';

        switch (newStatus) {
          case 'approved':
            title = '✅ ใบเบิกยาอนุมัติแล้ว';
            message = `ใบเบิกเลขที่ ${reqNo} อนุมัติแล้ว (เตรียมรับยา)`;
            type = 'success';
            break;
          case 'cancel':
            title = '❌ ใบเบิกยาถูกยกเลิก';
            message = `ใบเบิกเลขที่ ${reqNo} ถูกยกเลิก`;
            type = 'error';
            break;
        }

        // กรณีที่ 1: แจ้งเตือนหาคนสร้าง (ถ้ามี ID)
        if (requesterId) {
          await this.notiService.clearOpenNotifications(
            String(requesterId),
            'maDrug',
            requestId,
          );
          await this.notiService.createNotification({
            userId: requesterId,
            menuKey: 'maDrug', // เมนู Pharmacy
            title,
            message,
            type,
            meta: { documentId: requestId },
          });
        }
        // กรณีที่ 2: ถ้าไม่มี ID คนสร้าง ให้แจ้งเตือนหา Role 'pharmacy' ทุกคน
        else {
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
              meta: { documentId: requestId },
            });
          }
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
            title = '✨ ยืนยันการรับยาแล้ว';
            message = `ใบเบิกเลขที่ ${reqNo} ได้รับยาเรียบร้อยแล้ว (ปิดงาน)`;
            type = 'success';
          } else if (newStatus === 'pending') {
            title = '📝 มีการแก้ไขใบเบิกยา';
            message = `ใบเบิกเลขที่ ${reqNo} โดย ${requesterName} มีการแก้ไขข้อมูล`;
            type = 'info';
          }

          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'manageDrug', // เมนู Admin
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
