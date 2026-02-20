import { Injectable, Logger } from '@nestjs/common';
import { MaMedicalEquipmentRepo } from './maMedicalEquipment.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MaMedicalEquipmentService {
  constructor(
    private readonly maMedicalEquipmentRepo: MaMedicalEquipmentRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}
  private logger = new Logger('MaMedicalEquipmentService');

  async findAll() {
    return await this.maMedicalEquipmentRepo.findMany({
      include: {
        items: {
          include: { medicalEquipment: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return await this.maMedicalEquipmentRepo.findOne(id);
  }

  // ✅ 1. Create: แจ้ง Admin (เอา asset ออกแล้ว)
  async create(data: any) {
    const newRequest = await this.maMedicalEquipmentRepo.create({
      sentDate: new Date(data.sentDate),
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
      note: data.note,
      status: data.status ?? 'pending',
      createdById: data.createdById,
      createdBy: data.createdBy,
      items: {
        create: data.items.map((item: any) => ({
          medicalEquipmentId: item.medicalEquipmentId,
          quantity: item.quantity,
        })),
      },
    });

    try {
      // 🎯 ดึงแค่ Admin อย่างเดียว ไม่เอา asset
      const approvers = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const approverIds = approvers.map((u) => u.userId);

      if (approverIds.length > 0) {
        await this.notiService.createNotification({
          userId: approverIds,
          menuKey: 'maMedicalEquipment', // 🔔 Key Admin
          title: '🛠️ มีการส่งเครื่องมือแพทย์',
          message: `ผู้ส่ง: ${data.createdBy || 'ไม่ระบุ'} (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: newRequest.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newRequest;
  }

  // ✅ 2. UpdateEdit: User แก้ไข
  async updateEdit(id: number, data: any) {
    const { sentDate, note, items } = data;

    const updatedResult = await this.maMedicalEquipmentRepo.update({
      where: { id },
      data: {
        sentDate: sentDate ? new Date(sentDate) : undefined,
        note: note || undefined,
        status: 'pending',
        items: {
          deleteMany: {},
          create: items?.map((i: any) => ({
            medicalEquipmentId: i.medicalEquipmentId,
            quantity: i.quantity,
          })),
        },
      },
    });

    try {
      const requestData = await this.maMedicalEquipmentRepo.findOne(id);
      if (requestData?.createdById) {
        let targetUserUuid = String(requestData.createdById);

        if (targetUserUuid.length <= 20) {
          const user = await this.prisma.user.findUnique({
            where: { id: Number(targetUserUuid) },
            select: { userId: true },
          });
          if (user) targetUserUuid = user.userId;
        }

        await this.notiService.clearOpenNotifications(
          targetUserUuid,
          'medicalEquipment', // 🔔 Key User
          id,
        );
      }

      // 🎯 ดึงแค่ Admin อย่างเดียว ไม่เอา asset
      const approvers = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const approverIds = approvers.map((u) => u.userId);

      if (approverIds.length > 0) {
        await this.notiService.createNotification({
          userId: approverIds,
          menuKey: 'maMedicalEquipment', // 🔔 Key Admin
          title: '📝 มีการแก้ไขเครื่องมือแพทย์',
          message: `ผู้ส่ง ${requestData?.createdBy || '-'} ได้แก้ไขข้อมูลแล้ว`,
          type: 'info',
          meta: { documentId: id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle notification in updateEdit', error);
    }

    return updatedResult;
  }

  // ✅ 3. Update: รับค่า actorId มาเช็ค
  async update(
    id: number,
    data: Prisma.MaMedicalEquipmentUpdateInput,
    actorId?: string,
  ) {
    const oldData = await this.maMedicalEquipmentRepo.findOne(id);
    if (!oldData) throw new Error('Record not found');

    const updatedResult = await this.maMedicalEquipmentRepo.update({
      where: { id },
      data,
    });

    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData.status
    ) {
      this.handleStatusNotification(
        updatedResult,
        data.status as string,
        actorId,
      );
    }

    return updatedResult;
  }

  async delete(id: number) {
    try {
      const notificationsToCheck = await this.prisma.notification.findMany({
        where: {
          menuKey: { in: ['medicalEquipment', 'maMedicalEquipment'] },
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

    return await this.maMedicalEquipmentRepo.delete(id);
  }

  // ✅ 4. Helper Function: จัดการแจ้งเตือน
  private async handleStatusNotification(
    requestData: any,
    newStatus: string,
    actorId?: string,
  ) {
    try {
      const rawRequesterId = requestData.createdById;
      const requestId = requestData.id;
      const returnerName = requestData.returnName || 'เจ้าหน้าที่';

      let targetUserUuid: string | null = null;
      if (rawRequesterId) {
        const isUuid = String(rawRequesterId).length > 20;
        if (isUuid) {
          targetUserUuid = String(rawRequesterId);
        } else {
          const user = await this.prisma.user.findUnique({
            where: { id: Number(rawRequesterId) },
            select: { userId: true },
          });
          targetUserUuid = user?.userId || null;
        }
      }

      const isSelfAction =
        actorId && String(actorId) === String(targetUserUuid);

      // =========================================================
      // กลุ่มที่ 1: แจ้งเตือน User (Approve, Cancel, Verified)
      // =========================================================
      if (['approve', 'cancel', 'verified'].includes(newStatus)) {
        let title = '';
        let message = '';
        let type = 'info';

        switch (newStatus) {
          case 'approve':
            title = '✅ เครื่องมือแพทย์ได้รับการอนุมัติ';
            message = `รายการส่งเครื่องมือ (ID: ${requestId}) อนุมัติแล้ว`;
            type = 'success';
            break;
          case 'cancel':
            title = '❌ รายการถูกยกเลิก';
            message = `รายการส่งเครื่องมือ (ID: ${requestId}) ถูกยกเลิก`;
            type = 'error';
            break;
          case 'verified':
            title = '✨ ตรวจรับคืนเรียบร้อย';
            message = `รายการ (ID: ${requestId}) ดำเนินการเสร็จสิ้นสมบูรณ์`;
            type = 'success';
            break;
        }

        if (targetUserUuid && !isSelfAction) {
          await this.notiService.clearOpenNotifications(
            targetUserUuid,
            'medicalEquipment',
            requestId,
          );
          await this.notiService.createNotification({
            userId: targetUserUuid,
            menuKey: 'medicalEquipment',
            title,
            message,
            type,
            meta: { documentId: requestId },
          });
        }
      }

      // =========================================================
      // กลุ่มที่ 2: สถานะ RETURN
      // =========================================================
      else if (newStatus === 'return') {
        // 🎯 ดึงแค่ Admin อย่างเดียว ไม่เอา asset
        const approvers = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { userId: true },
        });
        const adminIds = approvers.map((u) => u.userId);

        if (adminIds.length > 0) {
          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'maMedicalEquipment',
            title: '↩️ มีการรับเครื่องมือคืน',
            message: `รับคืนโดย: ${returnerName} (ID: ${requestId}) รอตรวจปิดงาน`,
            type: 'warning',
            meta: { documentId: requestId },
          });
        }

        if (targetUserUuid && !isSelfAction) {
          await this.notiService.clearOpenNotifications(
            targetUserUuid,
            'medicalEquipment',
            requestId,
          );
          await this.notiService.createNotification({
            userId: targetUserUuid,
            menuKey: 'medicalEquipment',
            title: '📦 เครื่องมือถูกรับคืนแล้ว',
            message: `รายการนี้ถูกรับคืนไปแล้ว โดยคุณ "${returnerName}"`,
            type: 'info',
            meta: { documentId: requestId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle status notification', error);
    }
  }
}
