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
import { MasterCarService } from './masterCar.service';
import { Prisma } from '@prisma/client';

@Controller('masterCar')
export class MasterCarController {
  constructor(private readonly masterCarService: MasterCarService) {}
  private logger = new Logger('MasterCarController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.masterCarService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.masterCarService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MasterCarCreateInput) {
    this.logger.debug('create');
    return await this.masterCarService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MasterCarUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.masterCarService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.masterCarService.delete(+id);
  }
}
