import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { MaMedicalEquipmentService } from './maMedicalEquipment.service';
import { Prisma } from '@prisma/client';

@Controller('maMedicalEquipment')
export class MaMedicalEquipmentController {
  constructor(
    private readonly maMedicalEquipmentService: MaMedicalEquipmentService,
  ) {}
  private logger = new Logger('MaMedicalEquipmentController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.maMedicalEquipmentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.maMedicalEquipmentService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MaMedicalEquipmentCreateInput) {
    this.logger.debug('create');
    return await this.maMedicalEquipmentService.create(data);
  }

  @Patch('/Edit/:id')
  async updateEdit(@Param('id') id: string, @Body() data: any) {
    console.log(data);
    this.logger.debug(`patch update with id: ${id}`);
    return await this.maMedicalEquipmentService.updateEdit(+id, data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MaMedicalEquipmentUpdateInput & { actorId?: string },
  ) {
    // 👇 เพิ่มบรรทัดนี้เพื่อดูว่า frontend ส่งมาจริงไหม
    console.log('Update Data:', data);
    console.log('Actor ID received:', data.actorId);

    const { actorId, ...updateData } = data;
    return await this.maMedicalEquipmentService.update(
      +id,
      updateData,
      actorId,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.maMedicalEquipmentService.delete(+id);
  }
}
