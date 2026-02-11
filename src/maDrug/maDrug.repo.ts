import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

  // ✅ กดยืนยันรับยาเข้าคลัง -> ทำการ บวกสต็อก และ สร้าง Lot ใหม่ ตรงนี้
  async receiveMaDrugWithTransaction(id: number, payload: any) {
    const { items, totalPrice } = payload;

    return await this.prisma.$transaction(async (tx) => {
      // 1. เช็คสถานะก่อน กันคนกดซ้ำ
      const maDrug = await tx.maDrug.findUnique({ where: { id } });
      if (!maDrug) throw new BadRequestException('ไม่พบใบเบิกยา');
      if (maDrug.status === 'completed')
        throw new BadRequestException('รายการนี้รับเข้าคลังไปแล้ว');

      // 2. อัปเดตสถานะ Header เป็น Completed
      const updatedMaDrug = await tx.maDrug.update({
        where: { id: id },
        data: {
          status: 'completed',
          totalPrice: totalPrice,
          updatedAt: new Date(),
        },
      });

      // 3. จัดการรายการยา (บวกสต็อก + สร้าง Lot)
      if (items && items.length > 0) {
        for (const item of items) {
          const originalItem = await tx.maDrugItem.findUnique({
            where: { id: item.maDrugItemId },
          });

          if (!originalItem) continue;

          // ถ้ารับจริงเป็น null หรือไม่ได้ส่งมา ให้ใช้ยอดที่ขอเบิกตอนแรก
          const receivedQty =
            item.receivedQuantity ?? originalItem.quantity ?? 0;

          // A. อัปเดต MaDrugItem (จำนวนที่รับจริง + วันหมดอายุ)
          await tx.maDrugItem.update({
            where: { id: item.maDrugItemId },
            data: {
              quantity: receivedQty,
              expiryDate: item.expiryDate,
            },
          });

          // B. สร้าง DrugLot ใหม่เข้าคลัง (เพราะตอนขอเบิกเรายังไม่ได้สร้าง)
          if (item.expiryDate && receivedQty > 0) {
            await tx.drugLot.create({
              data: {
                drugId: item.drugId,
                lotNumber: `LOT-${Date.now()}-${item.maDrugItemId}`,
                expiryDate: item.expiryDate,
                quantity: receivedQty,
                price: originalItem.price || 0,
                isActive: true,
                maDrugItemId: item.maDrugItemId,
              },
            });
          }

          // C. บวกยอด Master Drug (เพิ่มสต็อกเข้าคลังจริงๆ ณ จุดนี้)
          if (receivedQty > 0) {
            await tx.drug.update({
              where: { id: item.drugId },
              data: {
                quantity: { increment: receivedQty },
              },
            });
          }
        }
      }

      return updatedMaDrug;
    });
  }
}
