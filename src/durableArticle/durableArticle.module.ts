import { Module } from '@nestjs/common';
import { DurableArticleController } from './durableArticle.controller';
import { DurableArticleService } from './durableArticle.service';
import { DurableArticleRepo } from './durableArticle.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DurableArticleController],
  providers: [DurableArticleService, DurableArticleRepo, PrismaService],
  exports: [DurableArticleService],
})
export class DurableArticleModule {}
