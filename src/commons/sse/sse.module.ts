import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContextModule } from '../context-service/context.module';
import { LoggerService } from '../logger/logger.service';
import { SseSubscriber } from '../subscribers/sse.subscriber';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Module({
  imports: [EventEmitterModule.forRoot(), ContextModule],
  controllers: [SseController],
  providers: [SseService, SseSubscriber, LoggerService],
})
export class SseModule {}
