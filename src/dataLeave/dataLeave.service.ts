import { Injectable, Logger } from '@nestjs/common';
import { DataLeaveRepo } from './dataLeave.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DataLeaveService {
  constructor(
    private readonly dataLeaveRepo: DataLeaveRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}
  private logger = new Logger('DataLeaveService');

  async findAll() {
    return this.dataLeaveRepo.findMany({
      include: {
        masterLeave: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.dataLeaveRepo.findUnique({
      where: { id },
      include: {
        masterLeave: true,
      },
    });
  }

  async findByUserId(createdById: string) {
    return await this.dataLeaveRepo.findMany({
      where: { createdById },
      include: { masterLeave: true },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // ✅ 1. ตอนสร้าง (Create) -> แจ้งเตือน Admin (และอาจจะแจ้ง Backup ด้วยก็ได้ถ้าต้องการ)
  async create(data: Prisma.DataLeaveCreateInput) {
    const newLeave = await this.dataLeaveRepo.create(data);

    try {
      // 1.1 แจ้ง Admin
      const approvers = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const approverIds = approvers.map((u) => u.userId);

      if (approverIds.length > 0) {
        await this.notiService.createNotification({
          userId: approverIds,
          menuKey: 'manageDataLeave', // 🔔 เมนู Admin
          title: 'รายการขอลางานใหม่',
          message: `ผู้ขอ: ${newLeave.createdName || 'ไม่ระบุ'} | เหตุผล: ${
            newLeave.reason
          }`,
          type: 'info',
          meta: { documentId: newLeave.id },
        });
      }

      // 1.2 (Optional) แจ้งคนรับผิดชอบงานแทน ว่ามีคนเสนอชื่อมา
      if (newLeave.backupUserId) {
        await this.notiService.createNotification({
          userId: newLeave.backupUserId,
          menuKey: 'dataLeave',
          title: 'คุณได้รับมอบหมายงานแทน (รออนุมัติ)',
          message: `คุณ ${newLeave.createdName} ได้ระบุให้คุณเป็นผู้รับผิดชอบงานแทน`,
          type: 'warning',
          meta: { documentId: newLeave.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newLeave;
  }

  // ✅ 2. ตอนแก้ไข (Update)
  async update(id: number, data: Prisma.DataLeaveUpdateInput) {
    const oldData = await this.dataLeaveRepo.findUnique({ where: { id } });
    if (!oldData) throw new Error('Leave request not found');

    const updatedResult = await this.dataLeaveRepo.update({
      where: { id },
      data,
    });

    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData.status
    ) {
      this.handleStatusNotification(updatedResult, data.status as string);
    }

    return updatedResult;
  }

  // ✅ 3. ตอนลบ (Delete) -> เคลียร์แจ้งเตือน
  async delete(id: number) {
    try {
      const notificationsToCheck = await this.prisma.notification.findMany({
        where: {
          menuKey: { in: ['dataLeave', 'manageDataLeave'] },
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
      this.logger.error(
        `Failed to cleanup notifications for leave request ${id}`,
        error,
      );
    }

    return await this.dataLeaveRepo.delete(id);
  }

  // ✅ 4. Helper Function: แจ้งเตือน User + Backup Person
  // ✅ 4. Helper Function: แจ้งเตือน User + Backup Person
  private async handleStatusNotification(leaveData: any, newStatus: string) {
    try {
      const requesterId = leaveData.createdById;
      const leaveId = leaveData.id;
      const requesterName = leaveData.createdName || 'พนักงาน';

      // ✅ ประกาศแล้วต้องใช้: ตัวแปร reason
      const reason = leaveData.reason || '-';
      const backupUserId = leaveData.backupUserId;

      // =========================================================
      // กลุ่มที่ 1: แจ้งเตือน User + Backup Person (Approve, Edit, Cancel)
      // =========================================================
      if (['approve', 'edit', 'cancel'].includes(newStatus)) {
        let title = '';
        let message = '';
        let type = 'info';

        switch (newStatus) {
          case 'approve': // เขียว
            title = '✅ อนุมัติการลา';
            // ✅ ใช้ตัวแปร reason ตรงนี้ครับ
            message = `การลาของ ${requesterName} (เหตุผล: ${reason}) ได้รับการอนุมัติแล้ว`;
            type = 'success';
            break;

          case 'edit': // ส้ม
            title = '⚠️ แจ้งแก้ไขข้อมูลการลา';
            // ✅ ใช้ตัวแปร reason ตรงนี้ครับ
            message = `ใบลา "${reason}" ของคุณต้องการข้อมูลเพิ่มเติม`;
            type = 'warning';
            break;

          case 'cancel': // แดง
            title = '❌ ยกเลิกการลา';
            // ✅ ใช้ตัวแปร reason ตรงนี้ครับ
            message = `การลา "${reason}" ถูกยกเลิก`;
            type = 'error';
            break;
        }

        // ⭐ รวมรายชื่อคนที่จะได้รับแจ้งเตือน (คนลา + คนรับงานแทน)
        const recipients = new Set<string>();

        if (requesterId) recipients.add(requesterId);
        if (backupUserId) recipients.add(backupUserId);

        // ⭐ วนลูปส่งให้ทุกคน
        for (const uid of recipients) {
          await this.notiService.clearOpenNotifications(
            String(uid),
            'dataLeave',
            leaveId,
          );

          await this.notiService.createNotification({
            userId: uid,
            menuKey: 'dataLeave',
            title,
            message,
            type,
            meta: { documentId: leaveId },
          });
        }
      }

      // =========================================================
      // กลุ่มที่ 2: แจ้งเตือน Admin (Pending - กรณีแก้กลับมา)
      // =========================================================
      else if (newStatus === 'pending') {
        const approvers = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { userId: true },
        });
        const adminIds = approvers.map((u) => u.userId);

        if (adminIds.length > 0) {
          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'manageDataLeave',
            title: '📝 มีการแก้ไขใบลา',
            // ✅ ใช้ตัวแปร reason ตรงนี้ด้วยก็ได้
            message: `คุณ ${requesterName} ได้แก้ไขข้อมูลการลา "${reason}" (รอตรวจสอบ)`,
            type: 'info',
            meta: { documentId: leaveId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle status notification', error);
    }
  }
}
