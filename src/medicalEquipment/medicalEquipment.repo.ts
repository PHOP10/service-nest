import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MedicalEquipmentRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MedicalEquipmentRepo');

  async findAll() {
    return await this.prisma.medicalEquipment.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.medicalEquipment.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MedicalEquipmentFindFirstArgs) {
    return await this.prisma.medicalEquipment.findFirst(query);
  }

  async findMany(query: Prisma.MedicalEquipmentFindManyArgs) {
    return await this.prisma.medicalEquipment.findMany(query);
  }

  async count() {
    return await this.prisma.medicalEquipment.count();
  }

  async update(data: Prisma.MedicalEquipmentUpdateArgs) {
    return await this.prisma.medicalEquipment.update(data);
  }

  async create(data: Prisma.MedicalEquipmentCreateInput) {
    return await this.prisma.medicalEquipment.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.medicalEquipment.delete({
      where: { id },
    });
  }
}
