import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
  Put,
} from '@nestjs/common';
import { MaDrugService } from './maDrug.service';
import { Prisma } from '@prisma/client';

@Controller('maDrug')
export class MaDrugController {
  constructor(private readonly maDrugService: MaDrugService) {}
  private logger = new Logger('MaDrugController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.maDrugService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.maDrugService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MaDrugCreateInput) {
    this.logger.debug('create');
    return await this.maDrugService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MaDrugUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.maDrugService.update(+id, data);
  }

  @Patch(':id/receive')
  async receiveMaDrug(@Param('id') id: string, @Body() body: any) {
    return await this.maDrugService.receiveMaDrug(+id, body);
  }

  @Put(':id')
  async edit(@Param('id') id: string, @Body() body: any) {
    return await this.maDrugService.editMaDrug(+id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.maDrugService.delete(+id);
  }
}
