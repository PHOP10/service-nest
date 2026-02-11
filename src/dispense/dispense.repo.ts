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

  // ✅ 1. กดยืนยันจ่ายยา (Execute) -> ทำการตัดสต็อกแบบ FEFO ตรงนี้
  async executeDispense(id: number, payload: any) {
    const { items, totalPrice } = payload;

    return await this.prisma.$transaction(async (tx) => {
      // 1. เช็คสถานะใบจ่ายยาก่อน
      const dispense = await tx.dispense.findUnique({
        where: { id },
      });

      if (!dispense) throw new BadRequestException('ไม่พบใบจ่ายยา');
      if (dispense.status === 'completed')
        throw new BadRequestException('รายการนี้จ่ายยาและตัดสต็อกไปแล้ว');

      // 2. ลูปทำรายการตัดสต็อกทีละยา
      for (const item of items) {
        if (item.quantity <= 0) continue; // ถ้าแก้เป็น 0 ก็ข้ามไปไม่ต้องตัดสต็อก

        const drugId = item.drugId;
        let qtyNeeded = item.quantity;

        // A. เช็คยอดรวมก่อนว่าพอไหม (Master Stock)
        const drugMaster = await tx.drug.findUnique({ where: { id: drugId } });
        if (!drugMaster) throw new BadRequestException(`ไม่พบยา ID ${drugId}`);

        if (drugMaster.quantity < qtyNeeded) {
          throw new BadRequestException(
            `ยา "${drugMaster.name}" มีไม่พอ (เหลือ: ${drugMaster.quantity}, จะตัด: ${qtyNeeded})`,
          );
        }

        // B. 🎯 ดึง Lot ที่มียา โดยเรียงตามวันหมดอายุ (FEFO: ใกล้หมดอายุสุด ขึ้นก่อน)
        const lots = await tx.drugLot.findMany({
          where: {
            drugId: drugId,
            quantity: { gt: 0 },
            isActive: true,
          },
          orderBy: { expiryDate: 'asc' },
        });

        let currentLotIndex = 0;

        // C. 🎯 วนลูปตัดสต็อกตาม Lot จนกว่าจะครบตามจำนวนที่ต้องการ
        while (qtyNeeded > 0) {
          if (currentLotIndex >= lots.length) {
            throw new BadRequestException(
              `ยา ${drugMaster.name} ข้อมูลสต็อกรายล๊อตไม่ถูกต้อง (หักล๊อตไม่พอ)`,
            );
          }

          const lot = lots[currentLotIndex];
          const deductAmount = Math.min(lot.quantity, qtyNeeded);

          // อัปเดตล๊อตนั้นๆ
          await tx.drugLot.update({
            where: { id: lot.id },
            data: {
              quantity: { decrement: deductAmount },
              isActive: lot.quantity - deductAmount > 0, // ถ้าหมดเกลี้ยงก็ปิด Active
            },
          });

          qtyNeeded -= deductAmount;
          currentLotIndex++;
        }

        // D. อัปเดตจำนวนจ่ายจริงใน DispenseItem
        await tx.dispenseItem.update({
          where: { id: item.dispenseItemId },
          data: {
            quantity: item.quantity,
          },
        });

        // E. ตัดสต็อกยอดรวมของยา (Master Drug)
        await tx.drug.update({
          where: { id: drugId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }

      // 3. ปิดงาน เปลี่ยนสถานะเป็น completed
      return await tx.dispense.update({
        where: { id },
        data: {
          status: 'completed',
          totalPrice: totalPrice,
          updatedAt: new Date(),
        },
      });
    });
  }

  // ✅ 2. แก้ไขใบจ่ายยาที่เสร็จไปแล้ว (ถ้าคุณยังมีฟีเจอร์นี้อยู่)
  async edit(id: number, data: any) {
    const { dispenseItems, ...headerData } = data;

    return await this.prisma.$transaction(async (tx) => {
      const oldDispense = await tx.dispense.findUnique({
        where: { id },
        include: { dispenseItems: true },
      });

      if (!oldDispense) throw new Error('ไม่พบรายการจ่ายยานี้');

      // ⚠️ คำเตือน: โค้ด edit เดิมของคุณ "คืนสต็อกเฉพาะ Master" ไม่ได้คืนเข้า "DrugLot"
      // ถ้าสถานะเป็น Pending (ยังไม่ได้ตัดตอน Create) จริงๆ โค้ดส่วน reverse นี้ไม่ควรทำงาน
      // แต่ผมคงโค้ดคุณไว้เพื่อไม่ให้กระทบ Flow อื่นๆ ของคุณครับ
      if (oldDispense.status === 'completed') {
        for (const item of oldDispense.dispenseItems) {
          await tx.drug.update({
            where: { id: item.drugId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      await tx.dispenseItem.deleteMany({
        where: { dispenseId: id },
      });

      const updatedDispense = await tx.dispense.update({
        where: { id },
        data: headerData,
      });

      if (dispenseItems && dispenseItems.length > 0) {
        for (const item of dispenseItems) {
          if (oldDispense.status === 'completed') {
            const drug = await tx.drug.findUnique({
              where: { id: item.drugId },
            });
            if (!drug || drug.quantity < item.quantity) {
              throw new Error(
                `ยา ${drug?.name || item.drugId} มีไม่พอจ่าย (เหลือ ${
                  drug?.quantity
                })`,
              );
            }
            await tx.drug.update({
              where: { id: item.drugId },
              data: { quantity: { decrement: item.quantity } },
            });
          }

          await tx.dispenseItem.create({
            data: {
              dispenseId: id,
              drugId: item.drugId,
              quantity: item.quantity,
              price: item.price,
            },
          });
        }
      }

      return updatedDispense;
    });
  }
}
