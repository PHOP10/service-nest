import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterCarRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MasterCarRepo');

  async findAll() {
    return await this.prisma.masterCar.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.masterCar.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MasterCarFindFirstArgs) {
    return await this.prisma.masterCar.findFirst(query);
  }

  async findMany(query: Prisma.MasterCarFindManyArgs) {
    return await this.prisma.masterCar.findMany(query);
  }

  async count() {
    return await this.prisma.masterCar.count();
  }

  async update(data: Prisma.MasterCarUpdateArgs) {
    return await this.prisma.masterCar.update(data);
  }

  async create(data: Prisma.MasterCarCreateInput) {
    return await this.prisma.masterCar.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.masterCar.delete({
      where: { id },
    });
  }
}
