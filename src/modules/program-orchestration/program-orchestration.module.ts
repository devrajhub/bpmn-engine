import { Module } from '@nestjs/common';
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { ProgramOrchestrationService } from './program-orchestration.service';

@Module({
  imports: [RestServiceModule],
  providers: [ProgramOrchestrationService, LoggerService],
  exports: [ProgramOrchestrationService],
})
export class WorkFlowModule {}
