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
  // ✅ เพิ่มฟังก์ชัน receive ที่ย้ายมาจาก Service
  async receive(id: number) {
    // 1. ดึงข้อมูลรายการยาที่ขอเบิก
    const maDrug = await this.prisma.maDrug.findUnique({
      where: { id },
      include: { maDrugItems: true },
    });

    if (!maDrug) throw new Error('ไม่พบรายการ');

    // เช็คสถานะ (ป้องกันการกดรับซ้ำ)
    if (maDrug.status === 'completed') throw new Error('รายการนี้รับของไปแล้ว');
    if (maDrug.status !== 'approved')
      throw new Error('สถานะไม่ถูกต้อง (ต้องอนุมัติก่อน)');

    // 2. ใช้ Transaction เพื่อความปลอดภัย
    return await this.prisma.$transaction(async (tx) => {
      // 2.1 วนลูปอัปเดตสต็อกยาแต่ละตัว
      for (const item of maDrug.maDrugItems) {
        await tx.drug.update({
          where: { id: item.drugId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // 2.2 อัปเดตสถานะใบเบิกเป็น completed
      return await tx.maDrug.update({
        where: { id },
        data: {
          status: 'completed',
          // updatedAt: new Date(), // ปกติ Prisma อัปเดตให้อัตโนมัติถ้าตั้ง @updatedAt ไว้
        },
      });
    });
  }
}
