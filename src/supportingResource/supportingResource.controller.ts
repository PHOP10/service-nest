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
import { SupportingResourceService } from './supportingResource.service';
import { Prisma } from '@prisma/client';

@Controller('supportingResource')
export class SupportingResourceController {
  constructor(
    private readonly supportingResourceService: SupportingResourceService,
  ) {}
  private logger = new Logger('SupportingResourceController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.supportingResourceService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.supportingResourceService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.SupportingResourceCreateInput) {
    this.logger.debug('create');
    return await this.supportingResourceService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.SupportingResourceUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.supportingResourceService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.supportingResourceService.delete(+id);
  }
}
