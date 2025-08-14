import { Module } from '@nestjs/common';
import { SupportingResourceController } from './supportingResource.controller';
import { SupportingResourceService } from './supportingResource.service';
import { SupportingResourceRepo } from './supportingResource.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SupportingResourceController],
  providers: [SupportingResourceService, SupportingResourceRepo, PrismaService],
  exports: [SupportingResourceService],
})
export class SupportingResourceModule {}
