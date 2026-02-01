/**
 * Satcom Workforce API - Entry Point
 *
 * This is the main entry point for the NestJS application.
 * It configures the application with validation, CORS, Swagger docs,
 * and starts the HTTP server.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS for web and mobile clients
  const corsOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3004',
  ];
  app.enableCors({
    origin: [
      ...corsOrigins,
      'http://localhost',       // nginx on port 80
      'http://localhost:8081',  // Expo dev
      'exp://localhost:8081',   // Expo dev
    ],
    credentials: true,
  });

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,           // Transform to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitives
      },
    }),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Satcom Workforce API')
    .setDescription('API for Satcom workforce visibility and management system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Start server
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 Satcom Workforce API running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();
