import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { install } from 'source-map-support';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './commons/exception-filters/allexceptions.filter';
import { LoggingInterceptor } from './commons/interceptors/logging.interceptor';
import { setupSwagger } from './swagger-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  app.setGlobalPrefix(config.get('API_PRIFIX'));
  app.enableVersioning({
    type: VersioningType.URI,
  });
  install();
  app.enableCors();
  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  setupSwagger(app);
  app.use(helmet());
  await app.listen(config.get('PORT'));
}
bootstrap();
