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
import { MasterLeaveService } from './masterLeave.service';
import { Prisma } from '@prisma/client';

@Controller('masterLeave')
export class MasterLeaveController {
  constructor(private readonly masterLeaveService: MasterLeaveService) {}
  private logger = new Logger('MasterLeaveController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.masterLeaveService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.masterLeaveService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MasterLeaveCreateInput) {
    this.logger.debug('create');
    return await this.masterLeaveService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MasterLeaveUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.masterLeaveService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.masterLeaveService.delete(+id);
  }
}
