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
import { MaCarService } from './maCar.service';
import { Prisma } from '@prisma/client';

@Controller('maCar')
export class MaCarController {
  constructor(private readonly maCarService: MaCarService) {}
  private logger = new Logger('MaCarController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.maCarService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.maCarService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MaCarCreateInput) {
    this.logger.debug('create');
    return await this.maCarService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.MaCarUpdateInput) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.maCarService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.maCarService.delete(+id);
  }
}
