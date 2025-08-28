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

  // async create(data: Prisma.DurableArticleCreateInput) {
  //   return await this.durableArticleRepo.create(data);
  // }

  async create(data: Prisma.DurableArticleCreateInput) {
    this.logger.debug('Create DurableArticle');

    const acquiredDate = new Date(data.acquiredDate as string);
    const now = new Date();

    let monthsUsed =
      (now.getFullYear() - acquiredDate.getFullYear()) * 12 +
      (now.getMonth() - acquiredDate.getMonth());

    const totalMonths = (data.usageLifespanYears as number) * 12;

    if (monthsUsed > totalMonths) monthsUsed = totalMonths;
    if (monthsUsed < 0) monthsUsed = 0;

    const accumulatedDepreciation =
      (data.monthlyDepreciation as number) * monthsUsed;

    let netValue = Math.max(
      (data.unitPrice as number) - accumulatedDepreciation,
      0,
    );

    // ✅ ถ้าใช้งานครบอายุการใช้งาน → บังคับ netValue = 0
    if (monthsUsed >= totalMonths) {
      netValue = 0;
    }

    const payload: Prisma.DurableArticleCreateInput = {
      ...data,
      accumulatedDepreciation,
      netValue,
    };

    // เรียกผ่าน durableArticleRepo
    return this.durableArticleRepo.create(payload);
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
