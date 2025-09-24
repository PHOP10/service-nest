import { Injectable, Logger } from '@nestjs/common';
import { DataLeaveRepo } from './dataLeave.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class DataLeaveService {
  constructor(private readonly dataLeaveRepo: DataLeaveRepo) {}
  private logger = new Logger('DataLeaveService');

  // async findAll() {
  //   return await this.dataLeaveRepo.findAll();
  // }
  async findAll() {
    return this.dataLeaveRepo.findMany({
      include: {
        masterLeave: true, // ✅ ดึงข้อมูล MasterLeave มาด้วย
      },
      orderBy: {
        createdAt: 'desc', // (ถ้าต้องการเรียงใหม่สุดก่อน)
      },
    });
  }

  async findOne(id: number) {
    return await this.dataLeaveRepo.findOne(id);
  }

  async findByUserId(createdById: string) {
    return await this.dataLeaveRepo.findMany({
      where: { createdById },
      include: { masterLeave: true },
    });
  }

  async create(data: Prisma.DataLeaveCreateInput) {
    return await this.dataLeaveRepo.create(data);
  }

  async update(id: number, data: Prisma.DataLeaveUpdateInput) {
    return await this.dataLeaveRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.dataLeaveRepo.delete(id);
  }
}
