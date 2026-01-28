import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DispenseRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('DispenseRepo');

  async findAll() {
    return await this.prisma.dispense.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.dispense.findUnique({
      where: { id },
    });
  }

  // เพิ่ม method นี้เพื่อให้ Service เรียกใช้แบบ Custom query ได้ (เช่นการใส่ include)
  async findFirst(query: Prisma.DispenseFindFirstArgs) {
    return await this.prisma.dispense.findFirst(query);
  }

  async findMany(query: Prisma.DispenseFindManyArgs) {
    return await this.prisma.dispense.findMany(query);
  }

  async count() {
    return await this.prisma.dispense.count();
  }

  async update(data: Prisma.DispenseUpdateArgs) {
    return await this.prisma.dispense.update(data);
  }

  async create(data: Prisma.DispenseCreateInput) {
    return await this.prisma.dispense.create({ data });
  }
  async delete(id: number) {
    return await this.prisma.dispense.delete({
      where: { id },
    });
  }

  async executeDispense(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const dispense = await tx.dispense.findUnique({
        where: { id },
        include: { dispenseItems: true },
      });

      if (!dispense) throw new BadRequestException('ไม่พบใบจ่ายยา');
      if (dispense.status === 'completed')
        throw new BadRequestException('รายการนี้จ่ายยาไปแล้ว');

      for (const item of dispense.dispenseItems) {
        const drug = await tx.drug.findUnique({ where: { id: item.drugId } });

        if (!drug) throw new BadRequestException(`ไม่พบยา ID ${item.drugId}`);
        if (drug.quantity < item.quantity) {
          throw new BadRequestException(
            `ยา "${drug.name}" มีไม่พอ (เหลือ: ${drug.quantity}, ต้องการ: ${item.quantity})`,
          );
        }

        // ตัดสต็อก
        await tx.drug.update({
          where: { id: item.drugId },
          data: {
            quantity: { decrement: item.quantity }, // ลบจำนวนออก
          },
        });
      }

      // 3.3 อัปเดตสถานะใบจ่ายเป็น completed
      return await tx.dispense.update({
        where: { id },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });
    });
  }
}
