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
import { DurableArticleService } from './durableArticle.service';
import { Prisma } from '@prisma/client';

@Controller('durableArticle')
export class DurableArticleController {
  constructor(private readonly durableArticleService: DurableArticleService) {}
  private logger = new Logger('DurableArticleController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.durableArticleService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.durableArticleService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.DurableArticleCreateInput) {
    this.logger.debug('create');
    return await this.durableArticleService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.DurableArticleUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.durableArticleService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.durableArticleService.delete(+id);
  }
}
