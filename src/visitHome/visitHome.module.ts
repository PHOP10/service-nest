import { Module } from '@nestjs/common';
import { VisitHomeController } from './visitHome.controller';
import { VisitHomeService } from './visitHome.service';
import { VisitHomeRepo } from './visitHome.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [VisitHomeController],
  providers: [VisitHomeService, VisitHomeRepo, PrismaService],
  exports: [VisitHomeService],
})
export class VisitHomeModule {}
