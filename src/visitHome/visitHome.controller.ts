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
import { VisitHomeService } from './visitHome.service';
import { Prisma } from '@prisma/client';

@Controller('visitHome')
export class VisitHomeController {
  constructor(private readonly visitHomeService: VisitHomeService) {}
  private logger = new Logger('VisitHomeController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.visitHomeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.visitHomeService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.VisitHomeCreateInput) {
    this.logger.debug('create');
    return await this.visitHomeService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.VisitHomeUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.visitHomeService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.visitHomeService.delete(+id);
  }
}
