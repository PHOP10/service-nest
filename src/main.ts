import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as morgan from 'morgan';
import config from './config';
import { join } from 'path';
// import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('App Service');
  const { port } = config();
  const app = await NestFactory.create(AppModule);
  // const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    morgan(
      ' :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    ),
  );
  app.use('/uploads', express.static(join(process.cwd(), 'public', 'uploads')));
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(port);
  logger.verbose(`Server listening on port ${port}`);
}
bootstrap();
