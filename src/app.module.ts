import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestContextModule } from 'nestjs-request-context';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './commons/gaurds/auth-gaurd';
import { RestServiceModule } from './commons/rest-service/rest-service.module';
import { SseModule } from './commons/sse/sse.module';
import { AuditModule } from './modules/audit/audit.module';
import { DmnModule } from './modules/dmn/dmn.module';
import { EngineModule } from './modules/engine/engine.module';
import { ProInstVariablesModule } from './modules/pro-inst-variables/pro-inst-variables.module';
import { ProcessDefinitionModule } from './modules/process-definition/process-definition.module';
import { ProcessInstanceModule } from './modules/process-instance/process-instance.module';
import { ProcessModuleModule } from './modules/process-module/process-module.module';
import { TaskModule } from './modules/task/task.module';
import { ContextService } from './commons/context-service/context.service';
import { ContextProvider } from './commons/context-service/context.provider';
import { AsyncContextMiddleware } from './commons/middleware/async-context.middleware';

@Module({
  imports: [
    RequestContextModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    JwtModule.register({}),
    ScheduleModule.forRoot(),
    AuditModule,
    SseModule,
    ProcessDefinitionModule,
    EngineModule,
    ProcessInstanceModule,
    TaskModule,
    ProInstVariablesModule,
    ProcessModuleModule,
    DmnModule,
    RestServiceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(contextService: ContextService) {
    ContextProvider.setContextService(contextService);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AsyncContextMiddleware).forRoutes('*');
  }
}
