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

  async executeDispense(id: number, payload: any) {
    const { items, totalPrice } = payload; // รับ items ที่แก้จำนวนแล้วมาจากหน้าบ้าน

    return await this.prisma.$transaction(async (tx) => {
      // 1. เช็คสถานะบิลก่อน
      const dispense = await tx.dispense.findUnique({
        where: { id },
      });

      if (!dispense) throw new BadRequestException('ไม่พบใบจ่ายยา');
      if (dispense.status === 'completed')
        throw new BadRequestException('รายการนี้จ่ายยาและตัดสต็อกไปแล้ว');

      // 2. ลูปตามรายการที่ส่งมาจากหน้าบ้าน (items)
      for (const item of items) {
        // เช็คสต็อกยา (Drug)
        const drug = await tx.drug.findUnique({ where: { id: item.drugId } });
        if (!drug) throw new BadRequestException(`ไม่พบยา ID ${item.drugId}`);

        // เช็คว่าพอจ่ายไหม (ตามจำนวนที่ส่งมาใหม่)
        if (drug.quantity < item.quantity) {
          throw new BadRequestException(
            `ยา "${drug.name}" มีไม่พอ (เหลือ: ${drug.quantity}, จะตัด: ${item.quantity})`,
          );
        }

        // A. อัปเดตจำนวนในใบจ่ายยา (DispenseItem) ให้ตรงกับความเป็นจริง
        await tx.dispenseItem.update({
          where: { id: item.dispenseItemId },
          data: {
            quantity: item.quantity, // อัปเดตจำนวนที่จ่ายจริง
            // price: item.price // ถ้ามีการแก้ราคาด้วย ก็ใส่ตรงนี้
          },
        });

        // B. ตัดสต็อกยา (Drug)
        await tx.drug.update({
          where: { id: item.drugId },
          data: {
            quantity: { decrement: item.quantity }, // ตัดตามจำนวนที่ส่งมา
          },
        });
      }

      // 3. อัปเดตสถานะบิลเป็น completed และยอดเงินรวมใหม่
      return await tx.dispense.update({
        where: { id },
        data: {
          status: 'completed',
          totalPrice: totalPrice, // อัปเดตยอดเงินรวมที่คำนวณใหม่จากหน้าบ้าน
          updatedAt: new Date(),
        },
      });
    });
  }

  async edit(id: number, data: any) {
    const { dispenseItems, ...headerData } = data;

    return await this.prisma.$transaction(async (tx) => {
      const oldDispense = await tx.dispense.findUnique({
        where: { id },
        include: { dispenseItems: true },
      });

      if (!oldDispense) throw new Error('ไม่พบรายการจ่ายยานี้');

      // 2. คืนสต็อกยาเดิมกลับเข้าคลัง (Reverse Stock)
      for (const item of oldDispense.dispenseItems) {
        await tx.drug.update({
          where: { id: item.drugId },
          data: { quantity: { increment: item.quantity } }, // + คืน
        });
      }

      // 3. ลบรายการยาเดิมทิ้ง
      await tx.dispenseItem.deleteMany({
        where: { dispenseId: id },
      });

      // 4. อัปเดตข้อมูลส่วนหัว (Header)
      const updatedDispense = await tx.dispense.update({
        where: { id },
        data: headerData,
      });

      // 5. สร้างรายการยา "ใหม่" และตัดสต็อกใหม่
      if (dispenseItems && dispenseItems.length > 0) {
        for (const item of dispenseItems) {
          // 5.1 ตรวจสอบสต็อกว่าพอจ่ายไหม (เช็คจากยอดปัจจุบันที่เพิ่งคืนของไปแล้ว)
          const drug = await tx.drug.findUnique({ where: { id: item.drugId } });
          if (!drug || drug.quantity < item.quantity) {
            throw new Error(
              `ยา ${drug?.name || item.drugId} มีไม่พอจ่าย (เหลือ ${
                drug?.quantity
              })`,
            );
          }

          // 5.2 สร้าง Item ใหม่
          await tx.dispenseItem.create({
            data: {
              dispenseId: id,
              drugId: item.drugId,
              quantity: item.quantity,
              price: item.price, // บันทึกราคา ณ วันที่แก้ไข
            },
          });

          // 5.3 ตัดสต็อกใหม่
          await tx.drug.update({
            where: { id: item.drugId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      return updatedDispense;
    });
  }
}
