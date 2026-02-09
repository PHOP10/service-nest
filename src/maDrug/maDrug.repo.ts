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
      // 1. อัปเดตสถานะ Header เป็น Completed
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
          // item = { maDrugItemId, drugId, receivedQuantity, expiryDate }

          // 2. ดึงข้อมูลเดิมมาเทียบ (เพื่อหาผลต่างยอด)
          const originalItem = await tx.maDrugItem.findUnique({
            where: { id: item.maDrugItemId },
            include: { drugLot: true },
          });

          if (!originalItem) continue;

          const oldQty = originalItem.quantity || 0;
          const newQty = item.receivedQuantity ?? oldQty; // ถ้ารับจริงเป็น null ให้ใช้ยอดเดิม
          const diff = newQty - oldQty; // ผลต่าง (เช่น เดิม 10 รับจริง 8 -> diff = -2)

          // 3. อัปเดต MaDrugItem (จำนวนรับจริง + วันหมดอายุ)
          await tx.maDrugItem.update({
            where: { id: item.maDrugItemId },
            data: {
              quantity: newQty,
              expiryDate: item.expiryDate, // ✅ บันทึกวันหมดอายุที่ยืนยันแล้ว
            },
          });

          // 4. จัดการ DrugLot
          if (originalItem.drugLot) {
            // 4.1 ถ้ามี Lot อยู่แล้ว (สร้างตอน Create) -> อัปเดตข้อมูลให้ตรงกับความจริง
            await tx.drugLot.update({
              where: { id: originalItem.drugLot.id },
              data: {
                quantity: newQty, // ปรับยอดใน Lot
                expiryDate: item.expiryDate, // ปรับวันหมดอายุใน Lot
              },
            });
          } else if (item.expiryDate) {
            // 4.2 ถ้ายังไม่มี Lot (เผื่อกรณีข้อมูลเก่า) -> สร้างใหม่
            await tx.drugLot.create({
              data: {
                drugId: item.drugId,
                lotNumber: `LOT-${Date.now()}-${item.maDrugItemId}`,
                expiryDate: item.expiryDate,
                quantity: newQty,
                price: originalItem.price || 0,
                isActive: true,
                maDrugItemId: item.maDrugItemId,
              },
            });
          }

          // 5. ปรับปรุงยอด Master Drug (Adjust Stock)
          // เราใช้ diff เพราะตอน Create เราบวกยอดไปแล้ว ครั้งนี้แค่ปรับปรุงส่วนต่าง
          if (diff !== 0) {
            await tx.drug.update({
              where: { id: item.drugId },
              data: {
                quantity: { increment: diff }, // ถ้า diff ติดลบ มันจะลดลงเอง
              },
            });
          }
        }
      }

      return updatedMaDrug;
    });
  }

  async edit(id: number, data: any) {
    const { maDrugItems, ...headerData } = data;

    return await this.prisma.$transaction(async (tx) => {
      // 1. คืนสต็อกของเก่าก่อนลบ (Reverse Stock)
      const oldItems = await tx.maDrugItem.findMany({
        where: { maDrugId: id },
      });

      for (const oldItem of oldItems) {
        if (oldItem.quantity) {
          // ลดยอด Master Drug กลับคืนไป
          await tx.drug.update({
            where: { id: oldItem.drugId },
            data: { quantity: { decrement: oldItem.quantity } },
          });
        }
        // ลบ Lot ที่เกี่ยวข้อง (ถ้ามี)
        await tx.drugLot.deleteMany({
          where: { maDrugItemId: oldItem.id },
        });
      }

      // 2. ลบรายการเก่าทิ้ง
      await tx.maDrugItem.deleteMany({
        where: { maDrugId: id },
      });

      // 3. อัปเดต Header
      await tx.maDrug.update({
        where: { id },
        data: headerData,
      });
      // 4. สร้างรายการใหม่ + สร้าง Lot ใหม่ + บวกสต็อกใหม่
      if (maDrugItems && maDrugItems.length > 0) {
        for (const item of maDrugItems) {
          // 4.1 สร้าง Item
          const newItem = await tx.maDrugItem.create({
            data: {
              maDrugId: id,
              drugId: item.drugId,
              quantity: item.quantity,
              price: item.price,
              expiryDate: item.expiryDate,
            },
          });

          // 4.2 สร้าง Lot ใหม่
          if (item.expiryDate) {
            await tx.drugLot.create({
              data: {
                drugId: item.drugId,
                lotNumber: `LOT-${Date.now()}-${newItem.id}`,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                price: item.price || 0,
                isActive: true,
                maDrugItemId: newItem.id,
              },
            });
          }

          // 4.3 บวกสต็อก Master Drug
          await tx.drug.update({
            where: { id: item.drugId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      return await tx.maDrug.findUnique({
        where: { id },
        include: { maDrugItems: true },
      });
    });
  }
}
