import { Injectable, Logger } from '@nestjs/common';
import { DrugRepo } from './drug.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class DrugService {
  constructor(private readonly drugRepo: DrugRepo) {}
  private logger = new Logger('DrugService');

  async findAll() {
    return await this.drugRepo.findMany({ orderBy: { id: 'desc' } });
  }

  async findOne(id: number) {
    return await this.drugRepo.findOne(id);
  }

  async create(data: Prisma.DrugCreateInput) {
    return await this.drugRepo.create(data);
  }

  async update(id: number, data: Prisma.DrugUpdateInput) {
    return await this.drugRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.drugRepo.delete(id);
  }
}
