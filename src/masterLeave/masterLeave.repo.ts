import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterLeaveRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MasterLeaveRepo');

  async findAll() {
    return await this.prisma.masterLeave.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.masterLeave.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MasterLeaveFindFirstArgs) {
    return await this.prisma.masterLeave.findFirst(query);
  }

  async findMany(query: Prisma.MasterLeaveFindManyArgs) {
    return await this.prisma.masterLeave.findMany(query);
  }

  async count() {
    return await this.prisma.masterLeave.count();
  }

  async update(data: Prisma.MasterLeaveUpdateArgs) {
    return await this.prisma.masterLeave.update(data);
  }

  async create(data: Prisma.MasterLeaveCreateInput) {
    return await this.prisma.masterLeave.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.masterLeave.delete({
      where: { id },
    });
  }
}
