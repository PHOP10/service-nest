import { Injectable, Logger } from '@nestjs/common';
import { UserRepo } from './user.repo';
import { Prisma } from '@prisma/client';
import { hashPassword } from 'src/utils/auth-helper';

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepo) {}

  private logger = new Logger('User service');

  async findAll() {
    return await this.userRepo.findAll();
  }

  async findOne(id: number) {
    return await this.userRepo.findOne(id);
  }

  async findByUserId(userId: string) {
    return await this.userRepo.findFirst({
      where: {
        userId,
      },
    });
  }

  async findByUsername(username: string) {
    return await this.userRepo.findFirst({
      where: {
        username,
      },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    const passwordHash = await hashPassword(data.password);
    const dataCreate = {
      ...data,
      password: passwordHash,
    };
    return await this.userRepo.create(dataCreate);
  }

  async update(userId: string, data: Prisma.UserUpdateInput) {
    return await this.userRepo.update({
      where: {
        userId,
      },
      data,
    });
  }

  async delete(id: number) {
    this.logger.debug(`Deleting user with id: ${id}`);
    return await this.userRepo.delete(id);
  }
}
