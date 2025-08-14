import { Module } from '@nestjs/common';
import { MasterLeaveController } from './masterLeave.controller';
import { MasterLeaveService } from './masterLeave.service';
import { MasterLeaveRepo } from './masterLeave.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MasterLeaveController],
  providers: [MasterLeaveService, MasterLeaveRepo, PrismaService],
  exports: [MasterLeaveService],
})
export class MasterLeaveModule {}
