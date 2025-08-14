import { Module } from '@nestjs/common';
import { MasterCarController } from './masterCar.controller';
import { MasterCarService } from './masterCar.service';
import { MasterCarRepo } from './masterCar.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MasterCarController],
  providers: [MasterCarService, MasterCarRepo, PrismaService],
  exports: [MasterCarService],
})
export class MasterCarModule {}
