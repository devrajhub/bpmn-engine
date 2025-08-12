// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerService } from 'src/commons/logger/logger.service';
import { AnyOtherModuleModule } from '../any-other-module/any-other-module.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, AnyOtherModuleModule],
  controllers: [HealthController],
  providers: [HealthService, LoggerService],
})
export class HealthModule {}
