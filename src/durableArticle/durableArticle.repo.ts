import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DurableArticleRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('DurableArticleRepo');

  async findAll() {
    return await this.prisma.durableArticle.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return await this.prisma.durableArticle.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.DurableArticleFindFirstArgs) {
    return await this.prisma.durableArticle.findFirst(query);
  }

  async findMany(query: Prisma.DurableArticleFindManyArgs) {
    return await this.prisma.durableArticle.findMany(query);
  }

  async count() {
    return await this.prisma.durableArticle.count();
  }

  async update(data: Prisma.DurableArticleUpdateArgs) {
    return await this.prisma.durableArticle.update(data);
  }

  async create(data: Prisma.DurableArticleCreateInput) {
    return await this.prisma.durableArticle.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.durableArticle.delete({
      where: { id },
    });
  }
}
