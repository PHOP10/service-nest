import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InfectiousWasteRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('InfectiousWasteRepo');

  async findAll() {
    return await this.prisma.infectiousWaste.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.infectiousWaste.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.InfectiousWasteFindFirstArgs) {
    return await this.prisma.infectiousWaste.findFirst(query);
  }

  async findMany(query: Prisma.InfectiousWasteFindManyArgs) {
    return await this.prisma.infectiousWaste.findMany(query);
  }

  async count() {
    return await this.prisma.infectiousWaste.count();
  }

  async update(data: Prisma.InfectiousWasteUpdateArgs) {
    return await this.prisma.infectiousWaste.update(data);
  }

  async create(data: Prisma.InfectiousWasteCreateInput) {
    return await this.prisma.infectiousWaste.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.infectiousWaste.delete({
      where: { id },
    });
  }
}
