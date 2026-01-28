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
    // ตรงนี้ Frontend สามารถส่ง JSON แบบ Nested เพื่อบันทึกหัวบิล+รายการยาพร้อมกันได้เลย
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete with id: ${id}`);
    return await this.dispenseService.delete(+id);
  }
}
