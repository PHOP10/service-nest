import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { DispenseService } from './dispense.service';
import { Prisma } from '@prisma/client';

@Controller('dispense')
export class DispenseController {
  constructor(private readonly dispenseService: DispenseService) {}
  private logger = new Logger('DispenseController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.dispenseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.dispenseService.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.DispenseCreateInput) {
    this.logger.debug('create');
    return await this.dispenseService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.DispenseUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.dispenseService.update(+id, data);
  }

  @Put(':id')
  async edit(@Param('id') id: string, @Body() body: any) {
    return await this.dispenseService.editDispense(+id, body);
  }

  @Patch(':id/execute')
  async executeDispense(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: any, // รับข้อมูล items, totalPrice ที่ส่งมาจากหน้าบ้าน
  ) {
    return await this.dispenseService.execute(id, payload);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.dispenseService.delete(+id);
  }
}
