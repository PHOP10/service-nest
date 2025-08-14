import { Injectable, Logger } from '@nestjs/common';
import { SupportingResourceRepo } from './supportingResource.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupportingResourceService {
  constructor(
    private readonly supportingResourceRepo: SupportingResourceRepo,
  ) {}
  private logger = new Logger('SupportingResourceService');

  async findAll() {
    return await this.supportingResourceRepo.findAll();
  }

  async findOne(id: number) {
    return await this.supportingResourceRepo.findOne(id);
  }

  async create(data: Prisma.SupportingResourceCreateInput) {
    return await this.supportingResourceRepo.create(data);
  }

  async update(id: number, data: Prisma.SupportingResourceUpdateInput) {
    return await this.supportingResourceRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.supportingResourceRepo.delete(id);
  }
}
