import { Injectable, Logger } from '@nestjs/common';
import { DurableArticleRepo } from './durableArticle.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class DurableArticleService {
  constructor(private readonly durableArticleRepo: DurableArticleRepo) {}
  private logger = new Logger('DurableArticleService');

  async findAll() {
    return await this.durableArticleRepo.findMany({
      orderBy: {
        code: 'asc',
      },
    });
  }
  async findOne(id: number) {
    return await this.durableArticleRepo.findOne(id);
  }

  async create(data: Prisma.DurableArticleCreateInput) {
    this.logger.debug('Create DurableArticle');
    const { accumulatedDepreciation, netValue, yearlyDepreciation } =
      this.calculateDepreciation(data);

    return this.durableArticleRepo.create({
      ...data,
      accumulatedDepreciation,
      netValue,
      yearlyDepreciation,
    });
  }

  async update(id: number, data: Prisma.DurableArticleUpdateInput) {
    this.logger.debug(`Update DurableArticle id=${id}`);

    // 1. เอาข้อมูลเก่ามาก่อน
    const existing = await this.durableArticleRepo.findOne(id);

    // 2. ดึงค่าใหม่ ถ้าไม่มีใช้ค่าจาก existing
    const acquiredDate =
      (data.acquiredDate as any)?.set ?? existing.acquiredDate;
    const unitPrice = (data.unitPrice as any)?.set ?? existing.unitPrice;
    const usageLifespanYears =
      (data.usageLifespanYears as any)?.set ?? existing.usageLifespanYears;
    const monthlyDepreciation =
      (data.monthlyDepreciation as any)?.set ?? existing.monthlyDepreciation;

    // 3. ส่งเข้า calculateDepreciation
    const { accumulatedDepreciation, netValue, yearlyDepreciation } =
      this.calculateDepreciation({
        acquiredDate,
        unitPrice,
        usageLifespanYears,
        monthlyDepreciation,
      });

    // 4. update
    return this.durableArticleRepo.update({
      where: { id },
      data: { ...data, accumulatedDepreciation, netValue, yearlyDepreciation },
    });
  }

  private calculateDepreciation(data: {
    acquiredDate: Date | string;
    unitPrice: number;
    usageLifespanYears: number;
    monthlyDepreciation: number;
  }) {
    const acquiredDate = new Date(data.acquiredDate);
    const now = new Date();

    let monthsUsed =
      (now.getFullYear() - acquiredDate.getFullYear()) * 12 +
      (now.getMonth() - acquiredDate.getMonth());

    const totalMonths = data.usageLifespanYears * 12;

    if (monthsUsed > totalMonths) monthsUsed = totalMonths;
    if (monthsUsed < 0) monthsUsed = 0;

    const accumulatedDepreciation = data.monthlyDepreciation * monthsUsed;
    const yearlyDepreciation = data.monthlyDepreciation * 12;

    let netValue = Math.max(data.unitPrice - accumulatedDepreciation, 0);

    if (monthsUsed >= totalMonths) {
      netValue = 0;
    }

    return { accumulatedDepreciation, netValue, yearlyDepreciation };
  }

  async delete(id: number) {
    return await this.durableArticleRepo.delete(id);
  }
}
