import { Injectable, Logger } from '@nestjs/common';
import { InfectiousWasteRepo } from './infectiousWaste.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class InfectiousWasteService {
  constructor(private readonly infectiousWasteRepo: InfectiousWasteRepo) {}
  private logger = new Logger('InfectiousWasteService');

  async findAll() {
    return await this.infectiousWasteRepo.findAll();
  }

  async findOne(id: number) {
    return await this.infectiousWasteRepo.findOne(id);
  }

  async create(data: Prisma.InfectiousWasteCreateInput) {
    return await this.infectiousWasteRepo.create(data);
  }

  async update(id: number, data: Prisma.InfectiousWasteUpdateInput) {
    return await this.infectiousWasteRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.infectiousWasteRepo.delete(id);
  }
}
