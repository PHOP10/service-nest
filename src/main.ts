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
  // app.use('/uploads', express.static(join(process.cwd(), 'public', 'uploads')));
  app.use(
    '/uploads',
    express.static(join(__dirname, '..', 'public', 'uploads')),
  );
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(port);
  logger.verbose(`Server listening on port ${port}`);

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000/'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
}
bootstrap();
