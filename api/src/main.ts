// Sentry'nin otomatik enstrümantasyonu için ilk import bu olmalı
import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { getCorsOrigins } from './common/cors-origins';

async function bootstrap() {
  const enableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  // rawBody: true — Stripe webhook imza doğrulaması req.rawBody'ye ihtiyaç duyar
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // uploads klasörünü /uploads yolundan statik olarak sun
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // HTTP güvenlik başlıkları
  app.use(
    helmet(
      enableSwagger
        ? {
            crossOriginEmbedderPolicy: false,
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
              },
            },
          }
        : {
            crossOriginEmbedderPolicy: false,
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
              },
            },
          },
    ),
  );

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Türk Expatlar API')
      .setDescription('Almanya Türkçe konuşan topluluk platformu')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3201;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  if (enableSwagger) {
    console.log(`Swagger: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
