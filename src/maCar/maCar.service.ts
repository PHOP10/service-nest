import { Injectable, Logger } from '@nestjs/common';
import { MaCarRepo } from './maCar.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MaCarService {
  constructor(
    private readonly maCarRepo: MaCarRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}

  private logger = new Logger('MaCarService');

  async findAll() {
    return await this.maCarRepo.findMany({
      include: {
        masterCar: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.maCarRepo.findOne(id);
  }

  async create(data: Prisma.MaCarCreateInput) {
    // 1. สร้างรายการจอง
    const newBooking = await this.maCarRepo.create(data);

    // 2. แจ้งเตือน Admin/Asset
    try {
      const approvers = await this.prisma.user.findMany({
        where: { role: { in: ['admin', 'asset'] } },
        select: { userId: true },
      });

      const approverIds = approvers.map((u) => u.userId);

      if (approverIds.length > 0) {
        await this.notiService.createNotification({
          userId: approverIds,
          menuKey: 'manageMaCar',
          title: 'รายการจองรถใหม่',
          message: `ผู้ขอ: ${
            newBooking.requesterName || 'ไม่ระบุ'
          } | ปลายทาง: ${newBooking.destination}`,
          type: 'info',
          meta: { documentId: newBooking.id },
        });
      }
    } catch (error) {
      this.logger.error('Error sending notification for MaCar create:', error);
    }

    return newBooking;
  }

  async update(id: number, data: Prisma.MaCarUpdateInput) {
    const oldData = await this.maCarRepo.findOne(id);

    if (!oldData) {
      throw new Error('Booking not found');
    }

    const updatedResult = await this.maCarRepo.update({
      where: { id },
      data,
    });

    // เช็คว่าสถานะเปลี่ยนหรือไม่
    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData.status
    ) {
      this.handleStatusNotification(updatedResult, data.status as string);
    }

    return updatedResult;
  }

  // ✅ 1. แก้ไข Delete: ลบแจ้งเตือนที่ค้างอยู่ออกด้วย (แก้ Ghost Notification)
  async delete(id: number) {
    try {
      // ค้นหา Notification ที่เกี่ยวข้องกับเมนูรถ (maCar / manageMaCar)
      const notificationsToCheck = await this.prisma.notification.findMany({
        where: {
          menuKey: { in: ['maCar', 'manageMaCar'] },
        },
      });

      // กรองหาอันที่มี documentId ตรงกับใบจองที่จะลบ
      const idsToDelete = notificationsToCheck
        .filter((n) => (n.meta as any)?.documentId === id)
        .map((n) => n.id);

      // สั่งลบทิ้ง
      if (idsToDelete.length > 0) {
        await this.prisma.notification.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup notifications for booking ${id}`,
        error,
      );
    }

    return await this.maCarRepo.delete(id);
  }

  // ✅ 2. แก้ไข Helper Function: แจ้งเตือนคนจอง + ผู้โดยสาร
  private async handleStatusNotification(bookingData: any, newStatus: string) {
    const requesterId = bookingData.createdById; // User ID คนจอง
    const bookingId = bookingData.id;
    const docNo = bookingData.documentNo || '-';
    const requesterName = bookingData.requesterName || 'ผู้ใช้งาน';

    // ------------------------------------------------------------
    // กลุ่มที่ 1: แจ้งเตือน User (คนจอง + ผู้โดยสาร)
    // (เมื่อ Admin เปลี่ยนสถานะเป็น Approve, Edit, Cancel)
    // ------------------------------------------------------------
    if (['approve', 'edit', 'cancel'].includes(newStatus)) {
      let message = '';
      let title = '';
      let type = 'info';

      switch (newStatus) {
        case 'approve':
          title = '✅ การจองรถได้รับอนุมัติ';
          message = `ใบจองเลขที่ ${docNo} ได้รับการอนุมัติแล้ว`;
          type = 'success';
          break;

        case 'edit':
          title = '⚠️ แจ้งแก้ไขข้อมูลการจอง';
          message = `ใบจองเลขที่ ${docNo} ต้องการข้อมูลเพิ่มเติม (โปรดตรวจสอบ)`;
          type = 'warning';
          break;

        case 'cancel':
          title = '❌ การจองรถถูกยกเลิก';
          message = `ใบจองเลขที่ ${docNo} ถูกยกเลิก`;
          type = 'error';
          break;
      }

      // ⭐ รวมรายชื่อคนที่จะได้รับแจ้งเตือน (ใช้ Set เพื่อกัน User ID ซ้ำ)
      const recipients = new Set<string>();

      // 1. ใส่คนจอง (Requester)
      if (requesterId) {
        recipients.add(requesterId);
      }

      // 2. ใส่ผู้โดยสาร (Passenger) - เช็คว่าเป็น ID จริง
      if (
        bookingData.passengerNames &&
        Array.isArray(bookingData.passengerNames)
      ) {
        bookingData.passengerNames.forEach((uid: string) => {
          if (typeof uid === 'string' && uid.length > 10) {
            recipients.add(uid);
          }
        });
      }

      // ⭐ วนลูปส่งให้ทุกคนใน Set
      await Promise.all(
        Array.from(recipients).map(async (uid) => {
          // 1. เคลียร์แจ้งเตือนเก่าของคนๆ นั้นก่อน
          await this.notiService.clearOpenNotifications(
            String(uid),
            'maCar',
            bookingId,
          );

          // 2. สร้างแจ้งเตือนใหม่
          return this.notiService.createNotification({
            userId: String(uid),
            menuKey: 'maCar',
            title: title,
            message: message,
            type: type as any,
            meta: { documentId: bookingId },
          });
        }),
      );
    }

    // ------------------------------------------------------------
    // กลุ่มที่ 2: แจ้งเตือน Admin (เมื่อ User จองใหม่, แก้ไขส่งใหม่, หรือ คืนรถ)
    // ------------------------------------------------------------
    else if (['pending', 'resubmitted', 'return'].includes(newStatus)) {
      const approvers = await this.prisma.user.findMany({
        where: { role: { in: ['admin', 'asset'] } },
        select: { userId: true },
      });
      const adminIds = approvers.map((u) => u.userId);

      if (adminIds.length > 0) {
        let title = '';
        let message = '';
        let type = 'info';

        if (newStatus === 'pending') {
          title = '📝 มีการแก้ไขคำขอจองรถ';
          message = `ผู้ใช้ ${requesterName} ได้แก้ไขข้อมูลการจอง (รอตรวจสอบอีกครั้ง)`;
        } else if (newStatus === 'resubmitted') {
          // 🎯 เพิ่มส่วนนี้สำหรับ Resubmitted
          title = '🔄 แก้ไขคำขอจองรถเรียบร้อย';
          message = `ผู้ใช้ ${requesterName} แก้ไขใบจอง ${docNo} ตามที่ร้องขอแล้ว (รอตรวจใหม่)`;
        } else if (newStatus === 'return') {
          title = '🚙 มีการแจ้งคืนรถ';
          message = `ผู้ใช้ ${requesterName} ได้ทำการคืนรถแล้ว (ใบจอง: ${docNo})`;
          type = 'warning';
        }

        // ส่งหา Admin / Asset ทุกคน
        await this.notiService.createNotification({
          userId: adminIds,
          menuKey: 'manageMaCar',
          title: title,
          message: message,
          type: type as any,
          meta: { documentId: bookingId },
        });
      }
    }
  }
}
