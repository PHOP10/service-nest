import { Injectable, Logger } from '@nestjs/common';
import { VisitHomeRepo } from './visitHome.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class VisitHomeService {
  constructor(private readonly visitHomeRepo: VisitHomeRepo) {}
  private logger = new Logger('VisitHomeService');

  async findAll() {
    return await this.visitHomeRepo.findAll();
  }

  async findOne(id: number) {
    return await this.visitHomeRepo.findOne(id);
  }

  async create(data: Prisma.VisitHomeCreateInput) {
    return await this.visitHomeRepo.create(data);
  }

  async update(id: number, data: Prisma.VisitHomeUpdateInput) {
    return await this.visitHomeRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.visitHomeRepo.delete(id);
  }
}
