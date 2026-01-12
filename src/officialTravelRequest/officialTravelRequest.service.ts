import { Injectable, Logger } from '@nestjs/common';
import { OfficialTravelRequestRepo } from './officialTravelRequest.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class OfficialTravelRequestService {
  constructor(
    private readonly officialTravelRequestRepo: OfficialTravelRequestRepo,
  ) {}
  private logger = new Logger('OfficialTravelRequestService');

  async findAll() {
    return await this.officialTravelRequestRepo.findMany({
      include: {
        MasterCar: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.officialTravelRequestRepo.findOne(id);
  }

  async create(data: Prisma.OfficialTravelRequestCreateInput) {
    return await this.officialTravelRequestRepo.create(data);
  }

  async update(id: number, data: Prisma.OfficialTravelRequestUpdateInput) {
    return await this.officialTravelRequestRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.officialTravelRequestRepo.delete(id);
  }
}
