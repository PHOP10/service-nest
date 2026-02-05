import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // สร้าง notification (ใช้โดย backend เมื่อมีเหตุการณ์ เช่น booking created)
  @Post()
  async create(@Body() body: any) {
    return this.svc.createNotification(body);
  }

  // ดึงรายการของ user
  @Get('user/:userId')
  async getUser(@Param('userId') userId: string) {
    return this.svc.getUserNotifications(userId);
  }

  // ดึง counts ของ user (รวม unread และ per menu)
  @Get('user/:userId/counts')
  async getUserCounts(@Param('userId') userId: string) {
    return this.svc.getUserCounts(userId);
  }

  // mark one notification as read
  @Patch(':id/read')
  async markOne(@Param('id') id: string) {
    return this.svc.markAsRead(Number(id));
  }

  // mark menu read (หรือทั้งหมดถ้าไม่ส่ง menuKey)
  @Patch('user/:userId/mark-read')
  async markMenuRead(
    @Param('userId') userId: string,
    // query ?menuKey=maCarBook or body can contain menuKey
    @Body() body?: any,
  ) {
    const menuKey = body?.menuKey;
    return this.svc.markMenuRead(userId, menuKey);
  }
}
