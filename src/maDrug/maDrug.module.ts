import { Module } from '@nestjs/common';
import { MaDrugController } from './maDrug.controller';
import { MaDrugService } from './maDrug.service';
import { MaDrugRepo } from './maDrug.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MaDrugController],
  providers: [MaDrugService, MaDrugRepo, PrismaService],
  exports: [MaDrugService],
})
export class MaDrugModule {}
