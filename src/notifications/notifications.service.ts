// // src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';

// @Injectable()
// export class NotificationsService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getCounts() {
//     const carPending = await this.prisma.maCar.count({
//       where: { status: 'pending' },
//     });

//     const leavePending = await this.prisma.dataLeave.count({
//       where: { status: 'pending' },
//     });

//     const MaMedicalEquipmentPending =
//       await this.prisma.maMedicalEquipment.count({
//         where: { status: 'pending' },
//       });

//     // เพิ่มเมนูอื่น ๆ ตามต้องการ
//     return {
//       manageMaCar: carPending,
//       manageDataLeave: leavePending,
//       maMedicalEquipment: MaMedicalEquipmentPending,
//     };
//   }
//   async getUserCounts(userId: string) {
//     const maMedicalEquipment = await this.prisma.maMedicalEquipment.count({
//       where: { createdById: userId, status: 'pending' },
//     });

//     return {
//       maMedicalEquipmentCounts: maMedicalEquipment,
//     };
//   }
// }

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(payload: {
    userId: string;
    menuKey: string;
    title?: string;
    message: string;
    meta?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        menuKey: payload.menuKey,
        title: payload.title,
        message: payload.message,
        meta: payload.meta,
      },
    });

    // push realtime
    this.gateway.sendToUser(payload.userId, {
      type: 'new_notification',
      notification,
    });

    return notification;
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

    // หรือแยกตาม menuKey ก็ได้
    const byMenu = await this.prisma.notification.groupBy({
      by: ['menuKey'],
      where: { userId, isRead: false },
      _count: { _all: true },
    });

    // convert to object { menuKey: count }
    const menuCounts = {};
    byMenu.forEach((r) => (menuCounts[r.menuKey] = r._count._all));

    return { unread, menuCounts };
  }

  // mark single notification read
  async markAsRead(notificationId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // mark all notifications for a user/menuKey as read
  async markMenuRead(userId: string, menuKey?: string) {
    const where: any = { userId, isRead: false };
    if (menuKey) where.menuKey = menuKey;

    const updated = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    // ส่ง event ว่า unread เปลี่ยน (คุณอาจส่ง count ใหม่)
    const counts = await this.getUserCounts(userId);
    this.gateway.sendToUser(userId, { type: 'counts_update', counts });

    return updated;
  }
}
