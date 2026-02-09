import { Injectable, Logger } from '@nestjs/common'; // ✅ 1. เพิ่ม Logger
import { Cron, CronExpression } from '@nestjs/schedule'; // ✅ 2. เพิ่ม Cron imports
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  // ✅ 3. ประกาศ Logger เพื่อใช้ใน Cron Job
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(payload: {
    userId: string | string[];
    menuKey: string;
    title?: string;
    message: string;
    type?: string;
    link?: string;
    meta?: any;
  }) {
    const userIds = Array.isArray(payload.userId)
      ? payload.userId
      : [payload.userId];

    const dataToCreate = userIds.map((uid) => ({
      userId: uid,
      menuKey: payload.menuKey,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      link: payload.link,
      meta: payload.meta ?? {},
    }));

    await this.prisma.notification.createMany({
      data: dataToCreate,
    });

    userIds.forEach((uid) => {
      this.gateway.sendToUser(uid, {
        type: 'new_notification',
        data: { ...payload, userId: uid, isRead: false, createdAt: new Date() },
      });
      this.pushNewCounts(uid);
    });
  }

  async clearOpenNotifications(
    userId: string,
    menuKey: string,
    documentId: number,
  ) {
    const unreadNotis = await this.prisma.notification.findMany({
      where: { userId, menuKey, isRead: false },
    });

    const idsToClear = unreadNotis
      .filter((n) => {
        const meta = n.meta as any;
        return meta && meta.documentId === documentId;
      })
      .map((n) => n.id);

    if (idsToClear.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: idsToClear } },
        data: { isRead: true },
      });
      await this.pushNewCounts(userId);
    }
  }

  async pushNewCounts(userId: string) {
    const counts = await this.getUserCounts(userId);
    this.gateway.sendToUser(userId, { type: 'counts_update', counts });
  }

  async getUserNotifications(userId: string, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getUserCounts(userId: string) {
    const unread = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    const byMenu = await this.prisma.notification.groupBy({
      by: ['menuKey'],
      where: { userId, isRead: false },
      _count: { id: true },
    });

    const menuCounts: Record<string, number> = {};
    byMenu.forEach((r) => (menuCounts[r.menuKey] = r._count.id));

    return { unread, menuCounts };
  }

  async markMenuRead(userId: string, menuKey?: string) {
    const where: any = { userId, isRead: false };
    if (menuKey) where.menuKey = menuKey;

    const updated = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    await this.pushNewCounts(userId);
    return updated;
  }

  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // ✅ Cron Job: ทำงานถูกต้องแล้ว
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronDeleteOldNotifications() {
    this.logger.debug('Running Cron Job: Deleting old notifications...');

    const daysToKeep = 90;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

    try {
      const deleted = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: dateThreshold,
          },
        },
      });

      this.logger.debug(`Deleted ${deleted.count} old notifications.`);
    } catch (error) {
      this.logger.error('Failed to delete old notifications', error);
    }
  }
}
