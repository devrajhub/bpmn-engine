import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { RestService } from 'src/commons/rest-service/rest.service';
import { EngineModule } from '../engine/engine.module';
import { ProInstVariablesModule } from '../pro-inst-variables/pro-inst-variables.module';
import { ProcessDefinitionModule } from '../process-definition/process-definition.module';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { TaskService } from '../task/task.service';
import { TenantService } from '../tenants/tenants.service';
import { ProcessInstanceController } from './process-instance.controller';
import { ProcessInstanceService } from './process-instance.service';

@Module({
  imports: [
    // TypeOrmModule.forFeature([ProcessInstance]),
    forwardRef(() => ProInstVariablesModule),
    forwardRef(() => EngineModule),
    forwardRef(() => ProcessDefinitionModule),
    RestServiceModule,
    HttpModule,
  ],
  providers: [
    ProcessInstanceService,
    TaskService,
    ProgramOrchestrationService,
    RestService,
    LoggerService,
    TenantService,
  ],
  controllers: [ProcessInstanceController],
  exports: [ProcessInstanceService],
})
export class ProcessInstanceModule {}
