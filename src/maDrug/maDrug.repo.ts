import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaDrugRepo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('MaDrugRepo');

  async findAll() {
    return await this.prisma.maDrug.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.maDrug.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.MaDrugFindFirstArgs) {
    return await this.prisma.maDrug.findFirst(query);
  }

  async findMany(query: Prisma.MaDrugFindManyArgs) {
    return await this.prisma.maDrug.findMany(query);
  }

  async count() {
    return await this.prisma.maDrug.count();
  }

  async update(data: Prisma.MaDrugUpdateArgs) {
    return await this.prisma.maDrug.update(data);
  }

  async create(data: Prisma.MaDrugCreateInput) {
    return await this.prisma.maDrug.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.maDrug.delete({
      where: { id },
    });
  }

  async receiveMaDrugWithTransaction(id: number, payload: any) {
    const { items, totalPrice } = payload;
    return await this.prisma.$transaction(async (tx) => {
      const updatedMaDrug = await tx.maDrug.update({
        where: { id: id },
        data: {
          status: 'completed',
          totalPrice: totalPrice,
          updatedAt: new Date(),
        },
      });

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.receivedQuantity && item.receivedQuantity > 0) {
            await tx.drug.update({
              where: { id: item.drugId },
              data: {
                quantity: {
                  increment: item.receivedQuantity,
                },
              },
            });
          }
        }
      }

      return updatedMaDrug;
    });
  }

  async edit(id: number, data: any) {
    // แยก maDrugItems ออกจากข้อมูล Header
    const { maDrugItems, ...headerData } = data;

    return await this.prisma.maDrug.update({
      where: { id },
      data: {
        // 1. อัปเดตข้อมูลส่วนหัว (Header) เช่น requestNumber, unit, note
        ...headerData,

        // 2. จัดการรายการยา (Relation)
        maDrugItems: {
          // 2.1 ลบรายการเดิมทิ้งทั้งหมดที่ผูกกับ id นี้ (Reset ของเก่า)
          deleteMany: {},

          // 2.2 สร้างรายการใหม่ตามที่ส่งมาจากหน้าบ้าน (Insert ของใหม่)
          create: maDrugItems.map((item: any) => ({
            drugId: item.drugId,
            quantity: item.quantity,
            // ⚠️ ไม่ต้องส่ง id ของ item ไป เพราะเราสร้างใหม่ เดี๋ยว Prisma รัน id ใหม่ให้เอง
          })),
        },
      },
    });
  }
}
