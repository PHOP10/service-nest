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
import { MasterDrugService } from './masterDrug.service';
import { Prisma } from '@prisma/client';

@Controller('masterDrug')
export class MasterDrugController {
  constructor(private readonly masterDrugService: MasterDrugService) {}
  private logger = new Logger('MasterDrugController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.masterDrugService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.masterDrugService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MasterDrugCreateInput) {
    this.logger.debug('create');
    return await this.masterDrugService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MasterDrugUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.masterDrugService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.masterDrugService.delete(+id);
  }
}
