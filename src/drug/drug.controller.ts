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
import { DrugService } from './drug.service';
import { Prisma } from '@prisma/client';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}
  private logger = new Logger('DrugController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.drugService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.drugService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.DrugCreateInput) {
    this.logger.debug('create');
    return await this.drugService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.DrugUpdateInput) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.drugService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.drugService.delete(+id);
  }
}
