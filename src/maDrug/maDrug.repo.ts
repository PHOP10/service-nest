import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaDrugRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MaDrugRepo');

  async findAll() {
    return await this.prisma.maDrug.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.maDrug.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MaDrugFindFirstArgs) {
    return await this.prisma.maDrug.findFirst(query);
  }

  async findMany(query: Prisma.MaDrugFindManyArgs) {
    return await this.prisma.maDrug.findMany(query);
  }

  async count() {
    return await this.prisma.maDrug.count();
  }

  async update(data: Prisma.MaDrugUpdateArgs) {
    return await this.prisma.maDrug.update(data);
  }

  async create(data: Prisma.MaDrugCreateInput) {
    return await this.prisma.maDrug.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.maDrug.delete({
      where: { id },
    });
  }
}
