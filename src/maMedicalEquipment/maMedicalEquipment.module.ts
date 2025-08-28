import { Module } from '@nestjs/common';
import { MaMedicalEquipmentController } from './maMedicalEquipment.controller';
import { MaMedicalEquipmentService } from './maMedicalEquipment.service';
import { MaMedicalEquipmentRepo } from './maMedicalEquipment.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MaMedicalEquipmentController],
  providers: [MaMedicalEquipmentService, MaMedicalEquipmentRepo, PrismaService],
  exports: [MaMedicalEquipmentService],
})
export class MaMedicalEquipmentModule {}
