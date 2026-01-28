import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';

@Controller('forgot-password')
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  private logger = new Logger('ForgotPasswordController');

  @Post('request-otp')
  async requestOtp(@Body() body: { username: string; contact: string }) {
    this.logger.debug(`Request OTP for: ${body.username}`);
    return await this.forgotPasswordService.requestOtp(
      body.username,
      body.contact,
    );
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { username: string; otp: string }) {
    this.logger.debug(`Verify OTP for: ${body.username}`);
    return await this.forgotPasswordService.verifyOtp(body.username, body.otp);
  }

  @Post('reset')
  async resetPassword(
    @Body() body: { resetToken: string; newPassword: string },
  ) {
    this.logger.debug(`Reset password process`);
    return await this.forgotPasswordService.resetPassword(
      body.resetToken,
      body.newPassword,
    );
  }
}
