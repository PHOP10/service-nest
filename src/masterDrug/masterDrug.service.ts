import { Injectable, Logger } from '@nestjs/common';
import { MasterDrugRepo } from './masterDrug.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterDrugService {
  constructor(private readonly masterDrugRepo: MasterDrugRepo) {}
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
    return await this.masterDrugRepo.delete(id);
  }
}
