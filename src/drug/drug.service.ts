import { Injectable, Logger } from '@nestjs/common';
import { DrugRepo } from './drug.repo';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DrugService {
  constructor(
    private readonly drugRepo: DrugRepo,
    private readonly prisma: PrismaService,
  ) {}
  private logger = new Logger('DrugService');

  async findAll() {
    return await this.drugRepo.findAll();
  }

  async findOne(id: number) {
    return await this.drugRepo.findOne(id);
  }

  async create(data: any) {
    const { expiryDate, ...drugData } = data;

    return await this.prisma.$transaction(async (tx) => {
      const newDrug = await tx.drug.create({
        data: {
          ...drugData,
          quantity: Number(drugData.quantity) || 0,
          price: Number(drugData.price) || 0,
        },
      });

      if (newDrug.quantity > 0 && expiryDate) {
        await tx.drugLot.create({
          data: {
            drugId: newDrug.id,
            lotNumber: `INIT-${Date.now()}`,
            quantity: newDrug.quantity,
            expiryDate: expiryDate,
            price: newDrug.price,
            isActive: true,
          },
        });
      }

      return newDrug;
    });
  }

  async update(id: number, data: Prisma.DrugUpdateInput) {
    return await this.drugRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      await tx.drugLot.deleteMany({
        where: { drugId: id },
      });
      return await tx.drug.delete({
        where: { id },
      });
    });
  }
}
