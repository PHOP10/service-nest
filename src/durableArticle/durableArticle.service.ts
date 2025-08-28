import { Injectable, Logger } from '@nestjs/common';
import { DurableArticleRepo } from './durableArticle.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class DurableArticleService {
  constructor(private readonly durableArticleRepo: DurableArticleRepo) {}
  private logger = new Logger('DurableArticleService');

  async findAll() {
    return await this.durableArticleRepo.findAll();
  }

  async findOne(id: number) {
    return await this.durableArticleRepo.findOne(id);
  }

  async create(data: Prisma.DurableArticleCreateInput) {
    return await this.durableArticleRepo.create(data);
  }

  async update(id: number, data: Prisma.DurableArticleUpdateInput) {
    return await this.durableArticleRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.durableArticleRepo.delete(id);
  }
}
