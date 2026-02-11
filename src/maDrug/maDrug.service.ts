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
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return await this.maDrugRepo.findOne(id);
  }

  // 🟢 1. Create (Pending): ห้องยาขอเบิก -> สร้างบิลเฉยๆ
  // 🎯 ดักทางแบบขั้นสุด! แกะข้อมูลทีละตัวเพื่อไม่ให้ Prisma อัปเดตสต็อกเอง
  // 🟢 1. Create (Pending): ห้องยาขอเบิก
  async create(data: any) {
    // 🚨 วางกับดักเช็คว่าโค้ดใหม่ทำงานหรือไม่!
    console.log(
      '\n\n🚀🚀🚀 === เข้าสู่ฟังก์ชัน CREATE (โค้ดใหม่ล่าสุด) === 🚀🚀🚀\n\n',
    );

    const newMaDrug = await this.prisma.$transaction(async (tx) => {
      const itemsToCreate = data.maDrugItems?.create || [];

      const createdHeader = await tx.maDrug.create({
        data: {
          requestNumber: data.requestNumber,
          requestUnit: data.requestUnit,
          roundNumber: data.roundNumber,
          requesterName: data.requesterName,
          requestDate: data.requestDate,
          note: data.note,
          status: 'pending',
          totalPrice: data.totalPrice,
          quantityUsed: data.quantityUsed,
          createdById: data.createdById,
        },
      });

      if (itemsToCreate.length > 0) {
        for (const item of itemsToCreate) {
          await tx.maDrugItem.create({
            data: {
              maDrugId: createdHeader.id,
              drugId: item.drugId,
              quantity: item.quantity,
              price: item.price,
              expiryDate: item.expiryDate || null,
            },
          });
        }
      }

      return await tx.maDrug.findUnique({
        where: { id: createdHeader.id },
        include: { maDrugItems: true },
      });
    });

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
          title: '💊 มีการเบิกยารายการใหม่',
          message: `ใบเบิกเลขที่: ${
            newMaDrug?.requestNumber || '-'
          } (รอตรวจสอบ)`,
          type: 'info',
          meta: { documentId: newMaDrug?.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newMaDrug;
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
      await this.handleStatusNotification(updatedResult, data.status as string);
    }

    return updatedResult;
  }

  // ✅ 3. Delete: เคลียร์แจ้งเตือนและลบบิล
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

  // ✅ 4. Receive: รับยาเข้าคลัง (การบวกสต็อกและการสร้าง Lot อยู่ที่ไฟล์ Repo 100%)
  async receiveMaDrug(id: number, payload: any) {
    const result = await this.maDrugRepo.receiveMaDrugWithTransaction(
      id,
      payload,
    );
    await this.handleStatusNotification(result, 'completed');
    return result;
  }

  // =================================================================================
  // 🔔 Helper Function: แจ้งเตือน
  // =================================================================================
  private async handleStatusNotification(requestData: any, newStatus: string) {
    try {
      const requestId = requestData.id;
      const reqNo = requestData.requestNumber || '-';
      const requesterName = requestData.createdName || 'ห้องยา';

      const creatorUserId = requestData.createdById;

      if (['approve', 'approved', 'cancel'].includes(newStatus)) {
        if (!creatorUserId) return;

        const isApprove = newStatus === 'approve' || newStatus === 'approved';
        const title = isApprove
          ? '✅ ใบเบิกยาอนุมัติแล้ว'
          : '❌ ใบเบิกยาถูกยกเลิก';
        const message = isApprove
          ? `ใบเบิกเลขที่ ${reqNo} อนุมัติแล้ว (เตรียมรับยา)`
          : `ใบเบิกเลขที่ ${reqNo} ถูกยกเลิก`;
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
      } else if (['completed', 'pending'].includes(newStatus)) {
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
              ? `ใบเบิกเลขที่ ${reqNo} ได้รับยาเรียบร้อยแล้ว (ปิดงาน)`
              : `ใบเบิกเลขที่ ${reqNo} โดยคุณ ${requesterName} มีการแก้ไขข้อมูล รอตรวจสอบ`;
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
