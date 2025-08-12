import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';

export const setupSwagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const swaggerPassword = configService.get<string>('SWAGGER_PASSWORD');
  const swaggerUser = configService.get<string>('SWAGGER_USERNAME');
  const apiPrefix = configService.get<string>('API_PREFIX') || 'bpmn/api'; // fallback

  const SWAGGER_PATH = `/${apiPrefix}/docs`;

  if (process.env.ENV == 'PROD') {
    app.use(
      [SWAGGER_PATH, `${SWAGGER_PATH}-json`],
      basicAuth({
        challenge: true,
        users: {
          [swaggerUser]: swaggerPassword,
        },
      }),
    );
  }

  const docConfig = new DocumentBuilder()
    .setTitle('BPMN')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);

  SwaggerModule.setup(SWAGGER_PATH, app, document);
};
