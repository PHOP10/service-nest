import { Injectable, Logger } from '@nestjs/common';
import { OfficialTravelRequestRepo } from './officialTravelRequest.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OfficialTravelRequestService {
  constructor(
    private readonly officialTravelRequestRepo: OfficialTravelRequestRepo,
    private readonly prisma: PrismaService,
    private readonly notiService: NotificationsService,
  ) {}
  private logger = new Logger('OfficialTravelRequestService');

  async findAll() {
    return await this.officialTravelRequestRepo.findMany({
      include: {
        MasterCar: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.officialTravelRequestRepo.findOne(id);
  }

  // ✅ 1. ตอนสร้าง (Create) -> แจ้งเตือน Admin ว่ามี Pending ใหม่
  async create(data: Prisma.OfficialTravelRequestCreateInput) {
    const newRequest = await this.officialTravelRequestRepo.create(data);

    try {
      // หา Admin
      const approvers = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { userId: true },
      });
      const approverIds = approvers.map((u) => u.userId);

      if (approverIds.length > 0) {
        await this.notiService.createNotification({
          userId: approverIds,
          menuKey: 'manageOfficialTravelRequest',
          title: 'รายการขอไปราชการใหม่',
          message: `หัวข้อ: ${newRequest.title || '-'} | สถานที่: ${
            newRequest.location
          }`,
          type: 'info',
          meta: { documentId: newRequest.id },
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification on create', error);
    }

    return newRequest;
  }

  // ✅ 2. ตอนแก้ไข (Update) -> เช็คการเปลี่ยนสถานะ
  async update(id: number, data: Prisma.OfficialTravelRequestUpdateInput) {
    const oldData = await this.officialTravelRequestRepo.findOne(id);
    if (!oldData) throw new Error('Request not found');

    const updatedResult = await this.officialTravelRequestRepo.update({
      where: { id },
      data,
    });

    // ถ้าสถานะเปลี่ยน ให้เรียกฟังก์ชันแจ้งเตือน
    if (
      data.status &&
      typeof data.status === 'string' &&
      data.status !== oldData.status
    ) {
      this.handleStatusNotification(updatedResult, data.status as string);
    }

    return updatedResult;
  }

  // ✅ 3. ตอนลบ (Delete) -> เพิ่มการลบแจ้งเตือนที่เกี่ยวข้องด้วย
  async delete(id: number) {
    try {
      // ค้นหา Notification ที่เกี่ยวข้องกับเมนูนี้
      const notificationsToCheck = await this.prisma.notification.findMany({
        where: {
          menuKey: {
            in: ['officialTravelRequest', 'manageOfficialTravelRequest'],
          },
        },
      });

      // กรองหาอันที่มี documentId ตรงกับใบงานที่จะลบ
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
        `Failed to cleanup notifications for request ${id}`,
        error,
      );
    }

    return await this.officialTravelRequestRepo.delete(id);
  }

  // ✅ 4. Helper Function: จัดการแจ้งเตือนตามสถานะ (รวมผู้โดยสาร)
  private async handleStatusNotification(requestData: any, newStatus: string) {
    try {
      const requesterId = requestData.createdById;
      const requestId = requestData.id;
      const docNo = requestData.documentNo || '-';
      const titleName = requestData.title || 'ไม่ระบุ';

      // =========================================================
      // กลุ่มที่ 1: แจ้งเตือน User + ผู้ร่วมเดินทาง (Approve, Edit, Cancel)
      // =========================================================
      if (['approve', 'edit', 'cancel'].includes(newStatus)) {
        let title = '';
        let message = '';
        let type = 'info';

        switch (newStatus) {
          case 'approve': // สีเขียว
            title = '✅ อนุมัติการไปราชการ';
            message = `เรื่อง "${titleName}" (${docNo}) ได้รับการอนุมัติแล้ว`;
            type = 'success';
            break;

          case 'edit': // สีส้ม
            title = '⚠️ แจ้งแก้ไขข้อมูลไปราชการ';
            message = `เรื่อง "${titleName}" ต้องการข้อมูลเพิ่มเติม (โปรดตรวจสอบ)`;
            type = 'warning';
            break;

          case 'cancel': // สีแดง
            title = '❌ ยกเลิกการไปราชการ';
            message = `เรื่อง "${titleName}" ถูกยกเลิก`;
            type = 'error';
            break;
        }

        // ⭐ รวมรายชื่อคนที่จะได้รับแจ้งเตือน (คนจอง + ผู้โดยสาร)
        const recipients = new Set<string>();

        // 1. ใส่คนจอง (Requester)
        if (requesterId) {
          recipients.add(requesterId);
        }

        // 2. ใส่ผู้โดยสาร (Passenger) - เช็คจาก passengerNames ที่เป็น Array ของ UserID
        if (
          requestData.passengerNames &&
          Array.isArray(requestData.passengerNames)
        ) {
          requestData.passengerNames.forEach((uid: string) => {
            if (typeof uid === 'string' && uid.length > 5) {
              recipients.add(uid);
            }
          });
        }

        // ⭐ วนลูปส่งให้ทุกคนใน Set
        for (const uid of recipients) {
          // 1. เคลียร์เลขแจ้งเตือนเก่าทิ้งก่อน
          await this.notiService.clearOpenNotifications(
            String(uid),
            'officialTravelRequest', // 🔔 แจ้งเมนู User
            requestId,
          );

          // 2. สร้างแจ้งเตือนใหม่
          await this.notiService.createNotification({
            userId: uid,
            menuKey: 'officialTravelRequest',
            title,
            message,
            type,
            meta: { documentId: requestId },
          });
        }
      }

      // =========================================================
      // กลุ่มที่ 2: แจ้งเตือน Admin (Pending)
      // (กรณี User แก้ไขข้อมูลส่งกลับมาใหม่)
      // =========================================================
      else if (newStatus === 'pending') {
        const approvers = await this.prisma.user.findMany({
          where: { role: 'admin' },
          select: { userId: true },
        });
        const adminIds = approvers.map((u) => u.userId);

        if (adminIds.length > 0) {
          // แจ้ง Admin ว่ามีการแก้ไขส่งมาใหม่
          await this.notiService.createNotification({
            userId: adminIds,
            menuKey: 'manageOfficialTravelRequest', // 🔔 แจ้งเมนูจัดการ
            title: '📝 มีการแก้ไขคำขอไปราชการ',
            message: `ผู้ขอ ${
              requestData.createdName || '-'
            } ได้แก้ไขข้อมูล (รอตรวจสอบ)`,
            type: 'info',
            meta: { documentId: requestId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle status notification', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronStatusUpdate() {
    this.logger.debug('Running auto-update status task...');

    const now = new Date();

    const result = await this.prisma.officialTravelRequest.updateMany({
      where: {
        status: 'approve',
        endDate: {
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
