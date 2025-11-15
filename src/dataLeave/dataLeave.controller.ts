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
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
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

    // 1️⃣ ดึงข้อมูลใบลาออกมาก่อน (เพื่อดูชื่อไฟล์)
    const data = await this.dataLeaveService.findOne(+id);
    if (!data) {
      throw new NotFoundException('ไม่พบข้อมูลใบลา');
    }

    // 2️⃣ ถ้ามีไฟล์แนบ → ลบไฟล์ออกจาก public
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

    // 3️⃣ ลบข้อมูลในฐานข้อมูล
    return await this.dataLeaveService.delete(+id);
  }
}
