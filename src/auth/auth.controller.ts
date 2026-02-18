import { UserService } from '../user/user.service';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { comparePassword, hashPassword } from '../utils/auth-helper';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from 'src/auth/auth.guard';
import { jwtConfig } from 'src/auth/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/profile')
  async getProfile(@Req() req) {
    const { user } = req;
    const getUser = await this.userService.findByUserId(user.userId);
    if (!getUser) {
      return getUser;
    }
    return getUser;
    // return getUserProfile(getUser);
  }

  @Post('/login')
  async logIn(@Body() body) {
    const { username, password } = body;

    const user = await this.userService.findByUsername(username);
    if (!user) {
      // ✅ ส่งภาษาไทยไปเลย
      throw new NotFoundException('ไม่พบชื่อผู้ใช้งานนี้ในระบบ');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // ✅ ส่งภาษาไทยไปเลย
      throw new UnauthorizedException(
        'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
      );
    }

    const { userId, firstName, lastName, email, role } = user;

    const payload = {
      userId,
      username,
      fullName: `${firstName} ${lastName}`,
      email,
      role,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expires as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.refreshExpires as any,
    });
    await this.userService.update(user.userId, {
      refreshToken,
    });
    return { ...payload, accessToken, refreshToken };
  }

  @UseGuards(AuthGuard)
  @Post('/logout')
  async logOut(@Req() req) {
    const { user } = req;
    await this.userService.update(user.userId, {
      refreshToken: null,
    });
    return { message: 'Logged Out' };
  }

  @UseGuards(AuthGuard)
  @Post('/chanage-password')
  async changePassword(@Body() body, @Req() req) {
    const { user } = req;
    const { password, newPassword } = body;
    const findUser = await this.userService.findByUsername(user.username);
    if (!findUser) {
      throw new NotFoundException('not found user');
    }
    const comparePassowrd = await comparePassword(password, findUser.password);
    if (!comparePassowrd) {
      throw new UnauthorizedException('password is incorrect');
    }

    const { userId, username, firstName, lastName, email, role } = findUser;

    const payload = {
      userId,
      username,
      fullName: `${firstName} ${lastName}`,
      email,
      role,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expires as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.refreshExpires as any,
    });

    const hashNewPassword = await hashPassword(newPassword);
    await this.userService.update(user.userId, {
      refreshToken,
      password: hashNewPassword,
    });
    return { ...payload, accessToken, refreshToken };
  }

  @UseGuards(AuthGuard)
  @Post('/reset-password')
  async resetPassword(@Body() body, @Req() req) {
    const { user } = req; // 1. เอา comment ออกเพื่อใช้งาน req
    const { password } = body; // 2. รับแค่ password ใหม่จาก body

    // 3. ค้นหาผู้ใช้จาก ID ที่อยู่ใน Token (ปลอดภัยกว่า)
    const findUser = await this.userService.findByUserId(user.userId);

    if (!findUser) {
      throw new NotFoundException('not found user');
    }

    const { userId, firstName, lastName, email, role } = findUser;
    const username = findUser.username; // ดึง username จากฐานข้อมูลมาใส่ payload แทน

    const payload = {
      userId,
      username,
      fullName: `${firstName} ${lastName}`,
      email,
      role,
    };

    const passwordHash = await hashPassword(password);
    await this.userService.update(findUser.userId, {
      password: passwordHash,
    });

    return { ...payload };
  }

  @Post('/refresh')
  async refresh(@Body() body) {
    const { refreshToken } = body;
    if (!refreshToken) {
      throw new UnauthorizedException('refreshToken invalid');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: jwtConfig.secret,
      });
      const user = await this.userService.findByUserId(payload.userId);
      if (!user) {
        throw new UnauthorizedException('refreshToken invalid!');
      }
      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('user refreshToken invalid!');
      }
      const { userId, username, fullName, email, levelId, role } = payload;
      const newPayload = {
        userId,
        username,
        fullName,
        email,
        levelId,
        role,
      };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: jwtConfig.secret,
        expiresIn: jwtConfig.expires as any,
      });
      const refreshTokenNew = this.jwtService.sign(newPayload, {
        secret: jwtConfig.secret,
        expiresIn: jwtConfig.refreshExpires as any,
      });
      await this.userService.update(user.userId, {
        refreshToken: refreshTokenNew,
      });
      return { ...newPayload, accessToken, refreshToken: refreshTokenNew };
    } catch {
      throw new UnauthorizedException('refreshToken invalid!');
    }
  }
}
