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
import { MedicalEquipmentService } from './medicalEquipment.service';
import { Prisma } from '@prisma/client';

@Controller('medicalEquipment')
export class MedicalEquipmentController {
  constructor(
    private readonly medicalEquipmentService: MedicalEquipmentService,
  ) {}
  private logger = new Logger('MedicalEquipmentController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.medicalEquipmentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.medicalEquipmentService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MedicalEquipmentCreateInput) {
    this.logger.debug('create');
    return await this.medicalEquipmentService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MedicalEquipmentUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.medicalEquipmentService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.medicalEquipmentService.delete(+id);
  }
}
