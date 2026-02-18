import { Injectable, Logger } from '@nestjs/common';
import { MasterLeaveRepo } from './masterLeave.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterLeaveService {
  constructor(private readonly masterLeaveRepo: MasterLeaveRepo) {}
  private logger = new Logger('MasterLeaveService');

  async findAll() {
    return await this.masterLeaveRepo.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    return await this.masterLeaveRepo.findOne(id);
  }

  async create(data: Prisma.MasterLeaveCreateInput) {
    return await this.masterLeaveRepo.create(data);
  }

  async update(id: number, data: Prisma.MasterLeaveUpdateInput) {
    return await this.masterLeaveRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.masterLeaveRepo.delete(id);
  }
}
