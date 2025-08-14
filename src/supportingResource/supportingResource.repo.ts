import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupportingResourceRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('SupportingResourceRepo');

  async findAll() {
    return await this.prisma.supportingResource.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.supportingResource.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.SupportingResourceFindFirstArgs) {
    return await this.prisma.supportingResource.findFirst(query);
  }

  async findMany(query: Prisma.SupportingResourceFindManyArgs) {
    return await this.prisma.supportingResource.findMany(query);
  }

  async count() {
    return await this.prisma.supportingResource.count();
  }

  async update(data: Prisma.SupportingResourceUpdateArgs) {
    return await this.prisma.supportingResource.update(data);
  }

  async create(data: Prisma.SupportingResourceCreateInput) {
    return await this.prisma.supportingResource.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.supportingResource.delete({
      where: { id },
    });
  }
}
