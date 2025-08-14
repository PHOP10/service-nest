import { Module } from '@nestjs/common';
import { DrugController } from './drug.controller';
import { DrugService } from './drug.service';
import { DrugRepo } from './drug.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DrugController],
  providers: [DrugService, DrugRepo, PrismaService],
  exports: [DrugService],
})
export class DrugModule {}
