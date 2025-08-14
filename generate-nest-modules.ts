import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, 'lib/prisma/schema.prisma');
const outputDir = path.join(__dirname, 'src');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ ไม่พบไฟล์ prisma/schema.prisma');
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf-8');

// หา model name ด้วย regex
const modelNames = [...schema.matchAll(/model\s+(\w+)\s+{/g)].map((m) => m[1]);

if (modelNames.length === 0) {
  console.error('❌ ไม่พบ model ใด ๆ ใน schema.prisma');
  process.exit(1);
}

// ข้าม User เพราะมีอยู่แล้ว
const filteredModels = modelNames.filter((m) => m.toLowerCase() !== 'user');

console.log('📦 พบ model:', filteredModels.join(', '));

filteredModels.forEach((model) => {
  const modelLower = model.charAt(0).toLowerCase() + model.slice(1);
  const dir = path.join(outputDir, modelLower);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // repo
  const repoContent = `
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ${model}Repo {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('${model}Repo');

  async findAll() {
    return await this.prisma.${modelLower}.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.${modelLower}.findUnique({
      where: { id },
    });
  }

  async findFirst(query: Prisma.${model}FindFirstArgs) {
    return await this.prisma.${modelLower}.findFirst(query);
  }

  async findMany(query: Prisma.${model}FindManyArgs) {
    return await this.prisma.${modelLower}.findMany(query);
  }

  async count() {
    return await this.prisma.${modelLower}.count();
  }

  async update(data: Prisma.${model}UpdateArgs) {
    return await this.prisma.${modelLower}.update(data);
  }

  async create(data: Prisma.${model}CreateInput) {
    return await this.prisma.${modelLower}.create({ data });
  }

  async delete(id: number) {
    return await this.prisma.${modelLower}.delete({
      where: { id },
    });
  }
}
`.trim();

  fs.writeFileSync(path.join(dir, `${modelLower}.repo.ts`), repoContent);

  // service
  const serviceContent = `
import { Injectable, Logger } from '@nestjs/common';
import { ${model}Repo } from './${modelLower}.repo';
import { Prisma } from '@prisma/client';

@Injectable()
export class ${model}Service {
  constructor(private readonly ${modelLower}Repo: ${model}Repo) {}
  private logger = new Logger('${model}Service');

  async findAll() {
    return await this.${modelLower}Repo.findAll();
  }

  async findOne(id: number) {
    return await this.${modelLower}Repo.findOne(id);
  }

  async create(data: Prisma.${model}CreateInput) {
    return await this.${modelLower}Repo.create(data);
  }

  async update(id: number, data: Prisma.${model}UpdateInput) {
    return await this.${modelLower}Repo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return await this.${modelLower}Repo.delete(id);
  }
}
`.trim();

  fs.writeFileSync(path.join(dir, `${modelLower}.service.ts`), serviceContent);

  // controller (ใช้ PATCH)
  const controllerContent = `
import { Controller, Get, Post, Patch, Delete, Body, Param, Logger } from '@nestjs/common';
import { ${model}Service } from './${modelLower}.service';
import { Prisma } from '@prisma/client';

@Controller('${modelLower}')
export class ${model}Controller {
  constructor(private readonly ${modelLower}Service: ${model}Service) {}
  private logger = new Logger('${model}Controller');

  @Get()
  async findAll() {
    this.logger.debug('findAll');
    return await this.${modelLower}Service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.debug(\`findOne with id: \${id}\`);
    return await this.${modelLower}Service.findOne(+id);
  }

  @Post()
  async create(@Body() data: Prisma.${model}CreateInput) {
    this.logger.debug('create');
    return await this.${modelLower}Service.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.${model}UpdateInput) {
    this.logger.debug(\`patch update with id: \${id}\`);
    return await this.${modelLower}Service.update(+id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    this.logger.debug(\`delete with id: \${id}\`);
    return await this.${modelLower}Service.delete(+id);
  }
}
`.trim();

  fs.writeFileSync(
    path.join(dir, `${modelLower}.controller.ts`),
    controllerContent,
  );

  // module
  const moduleContent = `
import { Module } from '@nestjs/common';
import { ${model}Controller } from './${modelLower}.controller';
import { ${model}Service } from './${modelLower}.service';
import { ${model}Repo } from './${modelLower}.repo';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [${model}Controller],
  providers: [${model}Service, ${model}Repo, PrismaService],
  exports: [${model}Service],
})
export class ${model}Module {}
`.trim();

  fs.writeFileSync(path.join(dir, `${modelLower}.module.ts`), moduleContent);

  console.log(`✅ Generated module for model: ${model}`);
});

console.log('\n🎉 สร้างไฟล์โมดูลเสร็จเรียบร้อยแล้ว');
