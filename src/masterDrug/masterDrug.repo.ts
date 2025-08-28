import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterDrugRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MasterDrugRepo');

  async findAll() {
    return await this.prisma.masterDrug.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.masterDrug.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MasterDrugFindFirstArgs) {
    return await this.prisma.masterDrug.findFirst(query);
  }

  async findMany(query: Prisma.MasterDrugFindManyArgs) {
    return await this.prisma.masterDrug.findMany(query);
  }

  async count() {
    return await this.prisma.masterDrug.count();
  }

  async update(data: Prisma.MasterDrugUpdateArgs) {
    return await this.prisma.masterDrug.update(data);
  }

  async create(data: Prisma.MasterDrugCreateInput) {
    return await this.prisma.masterDrug.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.masterDrug.delete({
      where: { id },
    });
  }
}
