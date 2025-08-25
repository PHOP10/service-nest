import { Injectable, Logger } from '@nestjs/common';
import { MaMedicalEquipmentRepo } from './maMedicalEquipment.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaMedicalEquipmentService {
  constructor(
    private readonly maMedicalEquipmentRepo: MaMedicalEquipmentRepo,
  ) {}
  private logger = new Logger('MaMedicalEquipmentService');

  // async findAll() {
  //   return await this.maMedicalEquipmentRepo.findAll();
  // }
  async findAll() {
    return await this.maMedicalEquipmentRepo.findMany({
      include: {
        items: {
          include: {
            medicalEquipment: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.maMedicalEquipmentRepo.findOne(id);
  }

  // async create(data: Prisma.MaMedicalEquipmentCreateInput) {
  //   return await this.maMedicalEquipmentRepo.create(data);
  // }
  async create(data: any) {
    // map body จาก frontend -> Prisma shape
    return await this.maMedicalEquipmentRepo.create({
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
  }

  async updateEdit(id: number, data: any) {
    const { sentDate, note, items } = data;

    return await this.maMedicalEquipmentRepo.update({
      where: { id },
      data: {
        sentDate: sentDate ? new Date(sentDate) : undefined,
        note: note || undefined,
        items: {
          deleteMany: {}, // ลบรายการเก่า
          create: items?.map((i: any) => ({
            medicalEquipmentId: i.medicalEquipmentId,
            quantity: i.quantity,
          })),
        },
      },
    });
  }

  async update(id: number, data: Prisma.MaMedicalEquipmentUpdateInput) {
    return await this.maMedicalEquipmentRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.maMedicalEquipmentRepo.delete(id);
  }
}
