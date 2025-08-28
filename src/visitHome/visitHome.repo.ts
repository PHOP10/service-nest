import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VisitHomeRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('VisitHomeRepo');

  async findAll() {
    return await this.prisma.visitHome.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.visitHome.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.VisitHomeFindFirstArgs) {
    return await this.prisma.visitHome.findFirst(query);
  }

  async findMany(query: Prisma.VisitHomeFindManyArgs) {
    return await this.prisma.visitHome.findMany(query);
  }

  async count() {
    return await this.prisma.visitHome.count();
  }

  async update(data: Prisma.VisitHomeUpdateArgs) {
    return await this.prisma.visitHome.update(data);
  }

  async create(data: Prisma.VisitHomeCreateInput) {
    return await this.prisma.visitHome.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.visitHome.delete({
      where: { id },
    });
  }
}
