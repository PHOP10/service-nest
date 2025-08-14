import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DrugRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('DrugRepo');

  async findAll() {
    return await this.prisma.drug.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.drug.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.DrugFindFirstArgs) {
    return await this.prisma.drug.findFirst(query);
  }

  async findMany(query: Prisma.DrugFindManyArgs) {
    return await this.prisma.drug.findMany(query);
  }

  async count() {
    return await this.prisma.drug.count();
  }

  async update(data: Prisma.DrugUpdateArgs) {
    return await this.prisma.drug.update(data);
  }

  async create(data: Prisma.DrugCreateInput) {
    return await this.prisma.drug.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.drug.delete({
      where: { id },
    });
  }
}
