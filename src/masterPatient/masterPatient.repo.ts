import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterPatientRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MasterPatientRepo');

  async findAll() {
    return await this.prisma.masterPatient.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.masterPatient.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MasterPatientFindFirstArgs) {
    return await this.prisma.masterPatient.findFirst(query);
  }

  async findMany(query: Prisma.MasterPatientFindManyArgs) {
    return await this.prisma.masterPatient.findMany(query);
  }

  async count() {
    return await this.prisma.masterPatient.count();
  }

  async update(data: Prisma.MasterPatientUpdateArgs) {
    return await this.prisma.masterPatient.update(data);
  }

  async create(data: Prisma.MasterPatientCreateInput) {
    return await this.prisma.masterPatient.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.masterPatient.delete({
      where: { id },
    });
  }
}
