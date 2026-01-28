import { Module } from '@nestjs/common';
import { DispenseController } from './dispense.controller';
import { DispenseService } from './dispense.service';
import { DispenseRepo } from './dispense.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DispenseController],
  providers: [DispenseService, DispenseRepo, PrismaService],
  exports: [DispenseService],
})
export class DispenseModule {}
