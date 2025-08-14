import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaCarRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MaCarRepo');

  async findAll() {
    return await this.prisma.maCar.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.maCar.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MaCarFindFirstArgs) {
    return await this.prisma.maCar.findFirst(query);
  }

  async findMany(query: Prisma.MaCarFindManyArgs) {
    return await this.prisma.maCar.findMany(query);
  }

  async count() {
    return await this.prisma.maCar.count();
  }

  async update(data: Prisma.MaCarUpdateArgs) {
    return await this.prisma.maCar.update(data);
  }

  async create(data: Prisma.MaCarCreateInput) {
    return await this.prisma.maCar.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.maCar.delete({
      where: { id },
    });
  }
}
