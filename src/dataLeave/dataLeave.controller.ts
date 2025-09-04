import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { DataLeaveService } from './dataLeave.service';
import { Prisma } from '@prisma/client';

@Controller('dataLeave')
export class DataLeaveController {
  constructor(private readonly dataLeaveService: DataLeaveService) {}
  private logger = new Logger('DataLeaveController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.dataLeaveService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.dataLeaveService.findOne(+id);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    this.logger.debug(`findByUserId with userId: ${userId}`);
    return await this.dataLeaveService.findByUserId(userId);
  }

  @Post()
  async create(@Body() data: Prisma.DataLeaveCreateInput) {
    this.logger.debug('create');
    return await this.dataLeaveService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.DataLeaveUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.dataLeaveService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.dataLeaveService.delete(+id);
  }
}
