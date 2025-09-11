// src/notifications/notifications.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('counts')
  async getCounts() {
    return this.notificationsService.getCounts();
  }

  @Get('userCounts/:userId')
  async getUserCounts(@Param('userId') userId: string) {
    return this.notificationsService.getUserCounts(userId);
  }
}
