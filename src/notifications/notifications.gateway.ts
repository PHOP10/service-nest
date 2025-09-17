import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  // ส่ง notification ไปยังผู้ใช้ (room = user-{userId})
  sendToUser(userId: string, payload: any) {
    this.server.to(`user-${userId}`).emit('notification', payload);
  }
}
