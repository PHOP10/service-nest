// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications', // แนะนำให้แยก namespace
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // เมื่อ Frontend connect เข้ามา
  handleConnection(client: Socket) {
    // วิธีง่ายสุด: ส่ง userId มาทาง query param
    // ตัวอย่าง URL: ws://localhost:3000/notifications?userId=user_123
    const userId = client.handshake.query.userId as string;

    if (userId) {
      const roomName = `user-${userId}`;
      client.join(roomName); // *** บรรทัดสำคัญ: เอา Socket นี้เข้าห้อง ***
      console.log(`User ${userId} joined room ${roomName}`);
    } else {
      console.log('Connection rejected: No userId provided');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  // ส่ง notification ไปยังผู้ใช้
  sendToUser(userId: string, payload: any) {
    this.server.to(`user-${userId}`).emit('notification', payload);
  }
}
