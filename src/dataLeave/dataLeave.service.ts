import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataLeaveRepo } from './dataLeave.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DataLeaveService {
  private readonly logger = new Logger(DataLeaveService.name);

  constructor(
    private readonly dataLeaveRepo: DataLeaveRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}

  async findAll() {
    return this.dataLeaveRepo.findMany({
      include: { masterLeave: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return await this.dataLeaveRepo.findUnique({
      where: { id },
      include: { masterLeave: true },
    });
  }

  async findByUserId(createdById: string) {
    return await this.dataLeaveRepo.findMany({
      where: { createdById },
      include: { masterLeave: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ✅ 1. Create -> Notify Admin & Backup
  async create(data: Prisma.DataLeaveCreateInput) {
    const newLeave = await this.dataLeaveRepo.create(data);

    // Fire and forget notification (don't await if you don't want to block response)
    this.handleCreateNotification(newLeave).catch((err) =>
      this.logger.error('Error sending create notification', err),
    );

    return newLeave;
  }

  // ✅ 2. Update -> Notify Status Changes
  async update(id: number, data: Prisma.DataLeaveUpdateInput) {
    const oldData = await this.dataLeaveRepo.findUnique({ where: { id } });
    if (!oldData) throw new NotFoundException('Leave request not found');

    const updatedResult = await this.dataLeaveRepo.update({
      where: { id },
      data,
    });

    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData.status
    ) {
      // Fire and forget
      this.handleStatusNotification(updatedResult, data.status as string).catch(
        (err) => this.logger.error('Error sending status notification', err),
      );
    }

    return updatedResult;
  }

  async delete(id: number) {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          menuKey: { in: ['dataLeave', 'manageDataLeave'] },
          meta: {
            path: ['documentId'],
            equals: id,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to cleanup notifications for leave request ${id}`,
        error,
      );
    }

    return await this.dataLeaveRepo.delete(id);
  }

  // ----------------------------------------------------------------
  // Private Helper Methods (แยก Logic ออกมาให้อ่านง่ายขึ้น)
  // ----------------------------------------------------------------

  private async handleCreateNotification(newLeave: any) {
    // 1. แจ้ง Admin
    const approvers = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { userId: true },
    });
    const approverIds = approvers.map((u) => u.userId);

    if (approverIds.length > 0) {
      await this.notiService.createNotification({
        userId: approverIds,
        menuKey: 'manageDataLeave',
        title: 'รายการขอลางานใหม่',
        message: `ผู้ขอ: ${newLeave.createdName || 'ไม่ระบุ'} | เหตุผล: ${
          newLeave.reason
        }`,
        type: 'info',
        meta: { documentId: newLeave.id },
      });
    }

    // 2. แจ้ง Backup User (ถ้ามี)
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
  }

  private async handleStatusNotification(leaveData: any, newStatus: string) {
    const {
      createdById,
      id: leaveId,
      createdName,
      reason,
      backupUserId,
    } = leaveData;
    const requesterName = createdName || 'พนักงาน';
    const leaveReason = reason || '-';

    // กรณี: Approve, Edit, Cancel -> แจ้ง User และ Backup
    if (['approve', 'edit', 'cancel'].includes(newStatus)) {
      const notiConfig = this.getStatusMessageConfig(
        newStatus,
        requesterName,
        leaveReason,
      );

      const recipients = new Set<string>();
      if (createdById) recipients.add(createdById);
      if (backupUserId) recipients.add(backupUserId);

      // ส่ง Notification ให้ทุกคนที่เกี่ยวข้อง
      await Promise.all(
        Array.from(recipients).map(async (uid) => {
          // Clear อันเก่าก่อน (ถ้าต้องการ)
          await this.notiService.clearOpenNotifications(
            uid,
            'dataLeave',
            leaveId,
          );

          return this.notiService.createNotification({
            userId: uid,
            menuKey: 'dataLeave',
            title: notiConfig.title,
            message: notiConfig.message,
            type: notiConfig.type as any,
            meta: { documentId: leaveId },
          });
        }),
      );
    }

    // กรณี: แก้กลับมาเป็น Pending -> แจ้ง Admin
    else if (['pending', 'resubmitted'].includes(newStatus)) {
      const approvers = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const adminIds = approvers.map((u) => u.userId);

      if (adminIds.length > 0) {
        // กำหนดข้อความตามสถานะ
        const title =
          newStatus === 'resubmitted' ? 'แก้ไขใบลาแล้ว' : 'มีการแก้ไขใบลา';
        const message =
          newStatus === 'resubmitted'
            ? `พนักงานแก้ไขใบลา "${leaveReason}" เรียบร้อยแล้ว (รอตรวจใหม่)`
            : `คุณ ${requesterName} ได้แก้ไขข้อมูลการลา "${leaveReason}" (รอตรวจสอบ)`;

        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageDataLeave',
          title: title,
          message: message,
          type: 'info',
          meta: { documentId: leaveId },
        });
      }
    }
  }

  // Helper สำหรับข้อความ (แยก Switch Case ออกมา)
  private getStatusMessageConfig(status: string, name: string, reason: string) {
    switch (status) {
      case 'approve':
        return {
          title: '✅ อนุมัติการลา',
          message: `การลาของ ${name} (เหตุผล: ${reason}) ได้รับการอนุมัติแล้ว`,
          type: 'success',
        };
      case 'edit':
        return {
          title: '⚠️ แจ้งแก้ไขข้อมูลการลา',
          message: `ใบลา "${reason}" ของคุณต้องการข้อมูลเพิ่มเติม`,
          type: 'warning',
        };
      case 'cancel':
        return {
          title: '❌ ยกเลิกการลา',
          message: `การลา "${reason}" ถูกยกเลิก`,
          type: 'error',
        };
      default:
        return { title: '', message: '', type: 'info' };
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronStatusUpdate() {
    this.logger.debug('Running auto-update status task...');

    const now = new Date();

    const result = await this.prisma.dataLeave.updateMany({
      where: {
        status: 'approve',
        dateEnd: {
          lt: now,
        },
      },
      data: {
        status: 'success',
      },
    });

    this.logger.debug(`Updated ${result.count} requests to success status.`);
  }
}
