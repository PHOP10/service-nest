import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DataLeaveRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('DataLeaveRepo');

  async findAll() {
    return await this.prisma.dataLeave.findMany({});
  }

  //   async findAll() {
  //   return await this.prisma.dataLeave.findMany({
  //     include: {
  //       masterLeave: true,
  //   });
  // }

  async findOne(id: number) {
    return await this.prisma.dataLeave.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.DataLeaveFindFirstArgs) {
    return await this.prisma.dataLeave.findFirst(query);
  }

  async findMany(query: Prisma.DataLeaveFindManyArgs) {
    return await this.prisma.dataLeave.findMany(query);
  }

  async count() {
    return await this.prisma.dataLeave.count();
  }

  async update(data: Prisma.DataLeaveUpdateArgs) {
    return await this.prisma.dataLeave.update(data);
  }

  async create(data: Prisma.DataLeaveCreateInput) {
    return await this.prisma.dataLeave.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.dataLeave.delete({
      where: { id },
    });
  }
}
