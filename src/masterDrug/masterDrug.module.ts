import { Module } from '@nestjs/common';
import { MasterDrugController } from './masterDrug.controller';
import { MasterDrugService } from './masterDrug.service';
import { MasterDrugRepo } from './masterDrug.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MasterDrugController],
  providers: [MasterDrugService, MasterDrugRepo, PrismaService],
  exports: [MasterDrugService],
})
export class MasterDrugModule {}
