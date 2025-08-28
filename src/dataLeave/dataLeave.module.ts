import { Module } from '@nestjs/common';
import { DataLeaveController } from './dataLeave.controller';
import { DataLeaveService } from './dataLeave.service';
import { DataLeaveRepo } from './dataLeave.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DataLeaveController],
  providers: [DataLeaveService, DataLeaveRepo, PrismaService],
  exports: [DataLeaveService],
})
export class DataLeaveModule {}
