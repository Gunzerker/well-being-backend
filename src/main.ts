import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.disable('x-powered-by');
  app.enableCors();
  app.use(helmet());
  app.use(helmet.noSniff());
  app.use(helmet.hidePoweredBy());
  app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
  app.use(helmet.contentSecurityPolicy());
  const config = new DocumentBuilder()
    .setTitle('BEYANG')
    .setDescription('The BEYANG API description')
    .setVersion('V1')
    .addTag('Beyangers 👩🏻🧕🧕 👩‍🦰 👨‍🦰 🧒 🧑🧔 👨🏻‍🦱 👨 🧒 😎 ')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.useStaticAssets(join(__dirname, '..', 'public'));

  SwaggerModule.setup('Beyang-api', app, document);
  await app.listen(process.env.PORT);
}
bootstrap();
