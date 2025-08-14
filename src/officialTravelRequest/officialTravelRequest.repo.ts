import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OfficialTravelRequestRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('OfficialTravelRequestRepo');

  async findAll() {
    return await this.prisma.officialTravelRequest.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.officialTravelRequest.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.OfficialTravelRequestFindFirstArgs) {
    return await this.prisma.officialTravelRequest.findFirst(query);
  }

  async findMany(query: Prisma.OfficialTravelRequestFindManyArgs) {
    return await this.prisma.officialTravelRequest.findMany(query);
  }

  async count() {
    return await this.prisma.officialTravelRequest.count();
  }

  async update(data: Prisma.OfficialTravelRequestUpdateArgs) {
    return await this.prisma.officialTravelRequest.update(data);
  }

  async create(data: Prisma.OfficialTravelRequestCreateInput) {
    return await this.prisma.officialTravelRequest.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.officialTravelRequest.delete({
      where: { id },
    });
  }
}
