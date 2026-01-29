import { Injectable, Logger } from '@nestjs/common';
import { MaDrugRepo } from './maDrug.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaDrugService {
  constructor(private readonly maDrugRepo: MaDrugRepo) {}
  private logger = new Logger('MaDrugService');

  async findAll() {
    return await this.maDrugRepo.findMany({
      include: {
        maDrugItems: {
          include: {
            drug: {
              include: {
                drugType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return await this.maDrugRepo.findOne(id);
  }

  async create(data: Prisma.MaDrugCreateInput) {
    return await this.maDrugRepo.create(data);
  }

  async update(id: number, data: Prisma.MaDrugUpdateInput) {
    return await this.maDrugRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.maDrugRepo.delete(id);
  }

  async receiveMaDrug(id: number, payload: any) {
    return await this.maDrugRepo.receiveMaDrugWithTransaction(id, payload);
  }

  async editMaDrug(id: number, payload: any) {
    const updateData = { ...payload };
    delete updateData.id;
    return await this.maDrugRepo.edit(id, updateData);
  }
}
