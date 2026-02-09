import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserRepo {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('user service');

  async onModuleInit() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const adminExists = await this.prisma.user.findFirst({
      where: { role: 'admin' },
    });
    if (!adminExists) {
      this.logger.log('No admin found in system. Creating default admin...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      await this.prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      this.logger.log('Default admin user created successfully!');
    } else {
      this.logger.log('Admin user already exists.');
    }
  }

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async findFirst(query: Prisma.UserFindFirstArgs) {
    return await this.prisma.user.findFirst(query);
  }

  async findMany(query: Prisma.UserFindManyArgs) {
    return await this.prisma.user.findMany(query);
  }

  async count() {
    return await this.prisma.user.count();
  }

  async update(data: Prisma.UserUpdateArgs) {
    return await this.prisma.user.update(data);
  }

  async create(data: Prisma.UserCreateInput) {
    return await this.prisma.user.create({ data });
  }

  async delete(id: number) {
    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });
    return deletedUser;
  }
}
