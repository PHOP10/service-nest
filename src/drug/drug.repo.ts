import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DrugRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('DrugRepo');

  async findAll() {
    const drugs = await this.prisma.drug.findMany({
      // ✅ 1. เพิ่มการเรียงลำดับ workingCode จากน้อยไปมาก
      orderBy: {
        workingCode: 'asc',
      },
      include: {
        drugLots: {
          where: {
            quantity: { gt: 0 },
          },
          orderBy: {
            expiryDate: 'asc',
          },
          take: 1,
        },
      },
    });

    return drugs.map((drug) => {
      const nearestExpiry =
        drug.drugLots.length > 0 ? drug.drugLots[0].expiryDate : null;

      return {
        ...drug,
        expiryDate: nearestExpiry,
        drugLots: undefined,
      };
    });
  }

  async findOne(id: number) {
    return await this.prisma.drug.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.DrugFindFirstArgs) {
    return await this.prisma.drug.findFirst(query);
  }

  async findMany(query: Prisma.DrugFindManyArgs) {
    return await this.prisma.drug.findMany(query);
  }

  async count() {
    return await this.prisma.drug.count();
  }

  // ✅ 2. ปรับปรุงฟังก์ชัน update เพื่อป้องกัน Error จากฟิลด์ส่วนเกินและ Data Type
  async update(args: Prisma.DrugUpdateArgs) {
    const data = args.data as any;

    // ลบฟิลด์ที่หน้าบ้านแอบแนบมา แต่ไม่มีอยู่จริงในตาราง Drug (ป้องกัน Prisma Error)
    if (data.expiryDate !== undefined) delete data.expiryDate;
    if (data.drugLots !== undefined) delete data.drugLots;

    // บังคับแปลงค่าให้เป็นตัวเลขเสมอ (แก้ปัญหาราคาไม่อัปเดต)
    if (data.price !== undefined) {
      data.price = Number(data.price);
    }
    if (data.drugTypeId !== undefined) {
      data.drugTypeId = Number(data.drugTypeId);
    }

    return await this.prisma.drug.update(args);
  }

  async create(data: Prisma.DrugCreateInput) {
    return await this.prisma.drug.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.drug.delete({
      where: { id },
    });
  }
}
