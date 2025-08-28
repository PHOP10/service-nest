import { Injectable, Logger } from '@nestjs/common';
import { MaMedicalEquipmentRepo } from './maMedicalEquipment.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaMedicalEquipmentService {
  constructor(
    private readonly maMedicalEquipmentRepo: MaMedicalEquipmentRepo,
  ) {}
  private logger = new Logger('MaMedicalEquipmentService');

  async findAll() {
    return await this.maMedicalEquipmentRepo.findAll();
  }

  async findOne(id: number) {
    return await this.maMedicalEquipmentRepo.findOne(id);
  }

  async create(data: Prisma.MaMedicalEquipmentCreateInput) {
    return await this.maMedicalEquipmentRepo.create(data);
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
