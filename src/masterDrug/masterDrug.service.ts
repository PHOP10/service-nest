import { Injectable, Logger } from '@nestjs/common';
import { MasterDrugRepo } from './masterDrug.repo';
import { Prisma } from '@prisma/client';
// ✅ 1. Import PrismaService เข้ามา
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDrugService {
  constructor(
    private readonly masterDrugRepo: MasterDrugRepo,
    // ✅ 2. Inject PrismaService เข้าไปใน Constructor
    private readonly prisma: PrismaService,
  ) {}

  private logger = new Logger('MasterDrugService');

  async findAll() {
    return await this.masterDrugRepo.findAll();
  }

  async findOne(id: number) {
    return await this.masterDrugRepo.findOne(id);
  }

  // ✅ ฟังก์ชัน create นี้จะใช้งานได้แล้ว เพราะมี this.prisma
  async create(data: any) {
    const { expiryDate, ...drugData } = data; // 1. แยกวันหมดอายุออกมา

    return await this.prisma.$transaction(async (tx) => {
      // 2. สร้างยา (Drug Master)
      const newDrug = await tx.drug.create({
        data: {
          ...drugData,
          quantity: Number(drugData.quantity) || 0,
          price: Number(drugData.price) || 0,
        },
      });

      // 3. ✅ สำคัญ: ถ้ามีจำนวนเริ่มต้น > 0 ต้องสร้าง DrugLot ด้วย!
      if (newDrug.quantity > 0 && expiryDate) {
        await tx.drugLot.create({
          data: {
            drugId: newDrug.id,
            lotNumber: `INIT-${Date.now()}`, // เลข Lot อัตโนมัติ
            quantity: newDrug.quantity,
            expiryDate: expiryDate, // บันทึกวันที่ส่งมาจากหน้าบ้าน
            price: newDrug.price,
            isActive: true,
          },
        });
      }

      return newDrug;
    });
  }

  async update(id: number, data: Prisma.MasterDrugUpdateInput) {
    return await this.masterDrugRepo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.masterDrugRepo.delete(id);
  }
}
