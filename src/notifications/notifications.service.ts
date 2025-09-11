// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCounts() {
    const carPending = await this.prisma.maCar.count({
      where: { status: 'pending' },
    });

    const leavePending = await this.prisma.dataLeave.count({
      where: { status: 'pending' },
    });

    const MaMedicalEquipmentPending =
      await this.prisma.maMedicalEquipment.count({
        where: { status: 'pending' },
      });

    // เพิ่มเมนูอื่น ๆ ตามต้องการ
    return {
      manageMaCar: carPending,
      manageDataLeave: leavePending,
      maMedicalEquipment: MaMedicalEquipmentPending,
    };
  }
  async getUserCounts(userId: string) {
    const maMedicalEquipment = await this.prisma.maMedicalEquipment.count({
      where: { createdById: userId, status: 'pending' },
    });

    return {
      maMedicalEquipmentCounts: maMedicalEquipment,
    };
  }
}
