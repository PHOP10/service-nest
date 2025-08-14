import { Module } from '@nestjs/common';
import { OfficialTravelRequestController } from './officialTravelRequest.controller';
import { OfficialTravelRequestService } from './officialTravelRequest.service';
import { OfficialTravelRequestRepo } from './officialTravelRequest.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [OfficialTravelRequestController],
  providers: [
    OfficialTravelRequestService,
    OfficialTravelRequestRepo,
    PrismaService,
  ],
  exports: [OfficialTravelRequestService],
})
export class OfficialTravelRequestModule {}
