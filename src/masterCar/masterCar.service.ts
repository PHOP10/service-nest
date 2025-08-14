import { Injectable, Logger } from '@nestjs/common';
import { MasterCarRepo } from './masterCar.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterCarService {
  constructor(private readonly masterCarRepo: MasterCarRepo) {}
  private logger = new Logger('MasterCarService');

  async findAll() {
    return await this.masterCarRepo.findAll();
  }

  async findOne(id: number) {
    return await this.masterCarRepo.findOne(id);
  }

  async create(data: Prisma.MasterCarCreateInput) {
    return await this.masterCarRepo.create(data);
  }

  async update(id: number, data: Prisma.MasterCarUpdateInput) {
    return await this.masterCarRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.masterCarRepo.delete(id);
  }
}
