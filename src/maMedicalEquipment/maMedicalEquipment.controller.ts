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

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MaMedicalEquipmentUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.maMedicalEquipmentService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.maMedicalEquipmentService.delete(+id);
  }
}
