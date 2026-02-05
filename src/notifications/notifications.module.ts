// src/notifications/notifications.module.ts
import { Module, Global } from '@nestjs/common'; // ใส่ Global ถ้าอยากให้เรียกใช้ได้ทั้งแอปโดยไม่ต้อง import บ่อยๆ
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Global() // แนะนำ: ใส่ Global เพื่อให้ Module อื่น (เช่น MaCar) เรียกใช้ Service นี้ได้เลย
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService, NotificationsGateway],
  exports: [NotificationsService], // Export Service ให้คนอื่นใช้
})
export class NotificationsModule {}
