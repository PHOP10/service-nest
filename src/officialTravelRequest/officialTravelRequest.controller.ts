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
import { OfficialTravelRequestService } from './officialTravelRequest.service';
import { Prisma } from '@prisma/client';

@Controller('officialTravelRequest')
export class OfficialTravelRequestController {
  constructor(
    private readonly officialTravelRequestService: OfficialTravelRequestService,
  ) {}
  private logger = new Logger('OfficialTravelRequestController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.officialTravelRequestService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.officialTravelRequestService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.OfficialTravelRequestCreateInput) {
    this.logger.debug('create');
    return await this.officialTravelRequestService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.OfficialTravelRequestUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.officialTravelRequestService.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.officialTravelRequestService.delete(+id);
  }
}
