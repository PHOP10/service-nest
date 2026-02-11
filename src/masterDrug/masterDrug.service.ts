import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { MasterDrugRepo } from './masterDrug.repo';
import { Prisma } from '@prisma/client';
// ✅ 1. Import PrismaService เข้ามา
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDrugService {
  constructor(
    private readonly masterDrugRepo: MasterDrugRepo,
    private readonly prisma: PrismaService,
  ) {}

  private logger = new Logger('MasterDrugService');

  async findAll() {
    return await this.masterDrugRepo.findAll();
  }

  async findOne(id: number) {
    return await this.masterDrugRepo.findOne(id);
  }

  async create(data: Prisma.MasterDrugCreateInput) {
    return await this.masterDrugRepo.create(data);
  }

  async update(id: number, data: Prisma.MasterDrugUpdateInput) {
    return await this.masterDrugRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    try {
      return await this.masterDrugRepo.delete(id);
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException(
          'ไม่สามารถลบประเภทยานี้ได้ เนื่องจากมียาที่ใช้งานอยู่',
        );
      }
      throw error;
    }
  }
}
