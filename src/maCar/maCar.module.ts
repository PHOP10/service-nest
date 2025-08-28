import { Module } from '@nestjs/common';
import { MaCarController } from './maCar.controller';
import { MaCarService } from './maCar.service';
import { MaCarRepo } from './maCar.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MaCarController],
  providers: [MaCarService, MaCarRepo, PrismaService],
  exports: [MaCarService],
})
export class MaCarModule {}
