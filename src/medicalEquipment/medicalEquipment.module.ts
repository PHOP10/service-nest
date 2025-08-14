import { Module } from '@nestjs/common';
import { MedicalEquipmentController } from './medicalEquipment.controller';
import { MedicalEquipmentService } from './medicalEquipment.service';
import { MedicalEquipmentRepo } from './medicalEquipment.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MedicalEquipmentController],
  providers: [MedicalEquipmentService, MedicalEquipmentRepo, PrismaService],
  exports: [MedicalEquipmentService],
})
export class MedicalEquipmentModule {}
