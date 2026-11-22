import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: process.env.CRM_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Authorization', 'X-Organization-Id'],
    credentials: false,
  });
  await app.listen(Number(process.env.API_PORT ?? 3001));
}

void bootstrap();
