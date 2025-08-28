import { Injectable, Logger } from '@nestjs/common';
import { MedicalEquipmentRepo } from './medicalEquipment.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MedicalEquipmentService {
  constructor(private readonly medicalEquipmentRepo: MedicalEquipmentRepo) {}
  private logger = new Logger('MedicalEquipmentService');

  // async findAll() {
  //   return await this.medicalEquipmentRepo.findAll();
  // }

  async findAll() {
    return await this.medicalEquipmentRepo.findMany({
      include: {
        items: {
          include: {
            maMedicalEquipment: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.medicalEquipmentRepo.findOne(id);
  }

  async create(data: Prisma.MedicalEquipmentCreateInput) {
    return await this.medicalEquipmentRepo.create(data);
  }

  async update(id: number, data: Prisma.MedicalEquipmentUpdateInput) {
    return await this.medicalEquipmentRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.medicalEquipmentRepo.delete(id);
  }
}
