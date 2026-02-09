import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { DataLeaveService } from './dataLeave.service';
import { Prisma } from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { File } from 'multer';
import { BadRequestException } from '@nestjs/common';

@Controller('dataLeave')
export class DataLeaveController {
  constructor(private readonly dataLeaveService: DataLeaveService) {}
  private logger = new Logger('DataLeaveController');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.dataLeaveService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(`findOne with id: ${id}`);
    return await this.dataLeaveService.findOne(+id);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    this.logger.debug(`findByUserId with userId: ${userId}`);
    return await this.dataLeaveService.findByUserId(userId);
  }

  @Post()
  async create(@Body() data: Prisma.DataLeaveCreateInput) {
    this.logger.debug('create');
    return await this.dataLeaveService.create(data);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          // แนะนำให้ใช้ process.cwd() เพื่ออ้างอิงจาก Root Project เสมอ
          // จะได้ไม่ต้องมานั่งนับจุด .. ว่าลึกแค่ไหนใน folder dist
          const uploadPath = join(
            process.cwd(),
            'public',
            'uploads',
            'data-leave',
          );
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      // 2. Limits (เหมือนเดิม ดีแล้ว)
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      // 3. File Filter (สำคัญมาก! ต้องเพิ่ม)
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return callback(
            new BadRequestException(
              'อนุญาตเฉพาะไฟล์รูปภาพ (jpg, png) และ PDF เท่านั้น',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: File) {
    if (!file) {
      this.logger.error('No file uploaded');
      return {
        success: false,
        message: 'No file uploaded',
      };
    }
    this.logger.debug(`Upload file: ${file.filename}`);

    return {
      success: true,
      fileName: file.filename,
      originalName: file.originalname,
      path: file.path,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.DataLeaveUpdateInput,
  ) {
    this.logger.debug(`patch update with id: ${id}`);
    return await this.dataLeaveService.update(+id, data);
  }

  // @Delete(':id')
  // async delete(@Param('id') id: string) {
  //   this.logger.debug(`delete with id: ${id}`);
  //   return await this.dataLeaveService.delete(+id);
  // }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(`🗑️ Delete dataLeave id: ${id}`);

    const data = await this.dataLeaveService.findOne(+id);
    if (!data) {
      throw new NotFoundException('ไม่พบข้อมูลใบลา');
    }

    if (data.fileName) {
      const filePath = join(
        process.cwd(),
        'public',
        'uploads',
        'data-leave',
        data.fileName,
      );

      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          this.logger.debug(`🧹 ลบไฟล์สำเร็จ: ${filePath}`);
        } catch (err) {
          this.logger.error(`❌ ลบไฟล์ไม่สำเร็จ: ${filePath}`, err);
          // ไม่ต้อง throw ถ้าอยากให้ลบข้อมูลต่อได้
        }
      } else {
        this.logger.warn(`⚠️ ไม่พบไฟล์ที่จะลบ: ${filePath}`);
      }
    }

    return await this.dataLeaveService.delete(+id);
  }
}
