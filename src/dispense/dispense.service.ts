import { Injectable, Logger } from '@nestjs/common';
import { DispenseRepo } from './dispense.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class DispenseService {
  constructor(private readonly dispenseRepo: DispenseRepo) {}
  private logger = new Logger('DispenseService');

  async findAll() {
    return await this.dispenseRepo.findMany({
      orderBy: { id: 'desc' },
      include: {
        dispenseItems: {
          include: {
            drug: {
              include: {
                drugType: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.dispenseRepo.findFirst({
      where: { id },
      include: {
        dispenseItems: {
          include: {
            drug: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.DispenseCreateInput) {
    return await this.dispenseRepo.create(data);
  }

  async update(id: number, data: Prisma.DispenseUpdateInput) {
    return await this.dispenseRepo.update({
      where: { id },
      data,
    });
  }

  async editDispense(id: number, payload: any) {
    const updateData = { ...payload };
    delete updateData.id;

    return await this.dispenseRepo.edit(id, updateData);
  }

  async delete(id: number) {
    return await this.dispenseRepo.delete(id);
  }

  async execute(id: number, payload: any) {
    return await this.dispenseRepo.executeDispense(id, payload);
  }
}
