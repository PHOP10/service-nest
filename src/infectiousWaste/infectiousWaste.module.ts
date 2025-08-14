import { Module } from '@nestjs/common';
import { InfectiousWasteController } from './infectiousWaste.controller';
import { InfectiousWasteService } from './infectiousWaste.service';
import { InfectiousWasteRepo } from './infectiousWaste.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [InfectiousWasteController],
  providers: [InfectiousWasteService, InfectiousWasteRepo, PrismaService],
  exports: [InfectiousWasteService],
})
export class InfectiousWasteModule {}
