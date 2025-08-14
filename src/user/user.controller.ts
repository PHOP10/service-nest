import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Prisma } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private logger = new Logger('User Controller');

  @Get('')
  async findAll() {
    this.logger.debug('findAll');
    return await this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.userService.findOne(+id);
  }

  @Post('')
  async create(@Body() data: Prisma.UserCreateInput) {
    this.logger.debug('create');
    return await this.userService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.UserUpdateInput) {
    this.logger.debug(`update user with id: ${id}`);
    return await this.userService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`delete user with id: ${id}`);
    return await this.userService.delete(+id);
  }
}
