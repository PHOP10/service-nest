import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'; // <--- เพิ่ม Exception ตรงนี้
import { UserRepo } from './user.repo';
import { Prisma } from '@prisma/client';
import { hashPassword } from 'src/utils/auth-helper';
import * as bcrypt from 'bcrypt'; // <--- เพิ่ม bcrypt ตรงนี้

@Injectable()
export class UserService {
  constructor(private userRepo: UserRepo) {}

  private logger = new Logger('User service');

  async findAll() {
    return await this.userRepo.findMany({
      orderBy: {
        id: 'asc',
      },
    });
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

  async changePassword(
    userId: string,
    oldPasswordRaw: string,
    newPasswordRaw: string,
  ) {
    const user = await this.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPasswordRaw, user.password);

    if (!isMatch) {
      throw new BadRequestException('รหัสผ่านเดิมไม่ถูกต้อง');
    }

    const hashedNewPassword = await hashPassword(newPasswordRaw);

    return await this.update(userId, {
      password: hashedNewPassword,
    });
  }
}
