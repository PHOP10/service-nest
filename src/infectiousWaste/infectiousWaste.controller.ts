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
import { InfectiousWasteService } from './infectiousWaste.service';
import { Prisma } from '@prisma/client';

@Controller('infectiousWaste')
export class InfectiousWasteController {
  constructor(
    private readonly infectiousWasteService: InfectiousWasteService,
  ) {}
  private logger = new Logger('InfectiousWasteController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.infectiousWasteService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.infectiousWasteService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.InfectiousWasteCreateInput) {
    this.logger.debug('create');
    return await this.infectiousWasteService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.InfectiousWasteUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.infectiousWasteService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.infectiousWasteService.delete(+id);
  }
}
