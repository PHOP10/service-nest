import { Injectable, Logger } from '@nestjs/common';
import { MasterPatientRepo } from './masterPatient.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterPatientService {
  constructor(private readonly masterPatientRepo: MasterPatientRepo) {}
  private logger = new Logger('MasterPatientService');

  async findAll() {
    return await this.masterPatientRepo.findAll();
  }

  async findOne(id: number) {
    return await this.masterPatientRepo.findOne(id);
  }

  async create(data: Prisma.MasterPatientCreateInput) {
    return await this.masterPatientRepo.create(data);
  }

  async update(id: number, data: Prisma.MasterPatientUpdateInput) {
    return await this.masterPatientRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.masterPatientRepo.delete(id);
  }
}
