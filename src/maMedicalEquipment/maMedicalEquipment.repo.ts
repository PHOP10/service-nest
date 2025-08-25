import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaMedicalEquipmentRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MaMedicalEquipmentRepo');

  async findAll() {
    return await this.prisma.maMedicalEquipment.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.maMedicalEquipment.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MaMedicalEquipmentFindFirstArgs) {
    return await this.prisma.maMedicalEquipment.findFirst(query);
  }

  async findMany(query: Prisma.MaMedicalEquipmentFindManyArgs) {
    return await this.prisma.maMedicalEquipment.findMany(query);
  }

  async count() {
    return await this.prisma.maMedicalEquipment.count();
  }

  async update(data: Prisma.MaMedicalEquipmentUpdateArgs) {
    return await this.prisma.maMedicalEquipment.update(data);
  }

  // async create(data: Prisma.MaMedicalEquipmentCreateInput) {
  //   return await this.prisma.maMedicalEquipment.create({ data });
  // }
  async create(data: Prisma.MaMedicalEquipmentCreateInput) {
    return await this.prisma.maMedicalEquipment.create({
      data,
      include: {
        items: {
          include: { medicalEquipment: true },
        },
      },
    });
  }

  async delete(id: number) {
    return await this.prisma.maMedicalEquipment.delete({
      where: { id },
    });
  }
}
