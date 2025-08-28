import { Module } from '@nestjs/common';
import { MasterPatientController } from './masterPatient.controller';
import { MasterPatientService } from './masterPatient.service';
import { MasterPatientRepo } from './masterPatient.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MasterPatientController],
  providers: [MasterPatientService, MasterPatientRepo, PrismaService],
  exports: [MasterPatientService],
})
export class MasterPatientModule {}
