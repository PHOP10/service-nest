import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepo } from '../user/user.repo';
import { hashPassword } from 'src/utils/auth-helper';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ForgotPasswordService {
  constructor(private userRepo: UserRepo) {}
  private logger = new Logger('ForgotPasswordService');
  async requestOtp(username: string, contact: string) {
    const user = await this.userRepo.findFirst({ where: { username } });

    if (!user) {
      throw new NotFoundException('ไม่พบชื่อผู้ใช้นี้ในระบบ');
    }

    const isEmailMatch = user.email === contact;
    const isPhoneMatch = user.phoneNumber === contact;

    if (!isEmailMatch && !isPhoneMatch) {
      throw new BadRequestException('อีเมลหรือเบอร์โทรศัพท์ไม่ถูกต้อง');
    }

    // สร้างเลข OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireDate = new Date();
    expireDate.setMinutes(expireDate.getMinutes() + 5);
    await this.userRepo.update({
      where: { userId: user.userId },
      data: { resetToken: otp, resetTokenExpire: expireDate },
    });

    if (isEmailMatch) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASS,
          },
        });

        // 2. ส่งอีเมล
        await transporter.sendMail({
          from: '"RPST Support" <kongkwm000@gmail.com>',
          to: contact,
          subject: 'รหัสยืนยันตัวตน (OTP) สำหรับเปลี่ยนรหัสผ่าน',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #333;">รหัส OTP ของคุณ</h2>
              <p>คุณได้ทำการร้องขอรหัสผ่านใหม่ รหัสยืนยันของคุณคือ:</p>
              <h1 style="color: #007bff; letter-spacing: 5px; background-color: #f0f8ff; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</h1>
              <p style="color: #666; font-size: 14px;">รหัสนี้จะหมดอายุภายใน 5 นาที</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <small style="color: #999;">หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</small>
            </div>
          `,
        });

        this.logger.log(`>>>>> ส่ง Email OTP ไปยัง ${contact} สำเร็จ <<<<<`);
      } catch (error) {
        this.logger.error('ส่งอีเมลไม่สำเร็จ:', error);
        throw new BadRequestException(
          'ระบบส่งอีเมลขัดข้อง กรุณาลองใหม่อีกครั้ง',
        );
      }
    } else if (isPhoneMatch) {
      this.logger.warn(
        `User ${username} ขอ OTP ผ่านเบอร์โทร (ระบบยังไม่รองรับ SMS) OTP คือ: ${otp}`,
      );
    }

    return { success: true, message: 'ส่ง OTP เรียบร้อยแล้ว' };
  }

  async verifyOtp(username: string, otp: string) {
    const user = await this.userRepo.findFirst({ where: { username } });

    if (!user || user.resetToken !== otp) {
      throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    }

    if (new Date() > user.resetTokenExpire) {
      throw new BadRequestException('รหัส OTP หมดอายุแล้ว');
    }

    const resetToken = randomBytes(32).toString('hex');
    const newExpire = new Date();
    newExpire.setMinutes(newExpire.getMinutes() + 15);

    await this.userRepo.update({
      where: { userId: user.userId },
      data: { resetToken: resetToken, resetTokenExpire: newExpire },
    });

    return { success: true, resetToken: resetToken };
  }

  async resetPassword(resetToken: string, newPasswordRaw: string) {
    const user = await this.userRepo.findFirst({
      where: { resetToken: resetToken },
    });

    if (!user) {
      throw new BadRequestException('Token ไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
    }

    if (new Date() > user.resetTokenExpire) {
      throw new BadRequestException('Token หมดอายุแล้ว กรุณาทำรายการใหม่');
    }

    const hashedNewPassword = await hashPassword(newPasswordRaw);

    await this.userRepo.update({
      where: { userId: user.userId },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpire: null,
      },
    });

    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
  }
}
