import { Injectable, Logger } from '@nestjs/common';
import { MaCarRepo } from './maCar.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaCarService {
  constructor(private readonly maCarRepo: MaCarRepo) {}
  private logger = new Logger('MaCarService');

  async findAll() {
    return await this.maCarRepo.findAll();
  }

  async findOne(id: number) {
    return await this.maCarRepo.findOne(id);
  }

  async create(data: Prisma.MaCarCreateInput) {
    return await this.maCarRepo.create(data);
  }

  async update(id: number, data: Prisma.MaCarUpdateInput) {
    return await this.maCarRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.maCarRepo.delete(id);
  }
}
