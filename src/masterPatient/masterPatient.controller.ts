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
import { MasterPatientService } from './masterPatient.service';
import { Prisma } from '@prisma/client';

@Controller('masterPatient')
export class MasterPatientController {
  constructor(private readonly masterPatientService: MasterPatientService) {}
  private logger = new Logger('MasterPatientController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.masterPatientService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.masterPatientService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.MasterPatientCreateInput) {
    this.logger.debug('create');
    return await this.masterPatientService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.MasterPatientUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.masterPatientService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.masterPatientService.delete(+id);
  }
}
