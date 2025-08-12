import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { RestService } from 'src/commons/rest-service/rest.service';
import { EngineModule } from '../engine/engine.module';
import { ProInstVariablesModule } from '../pro-inst-variables/pro-inst-variables.module';
import { ProInstVariablesService } from '../pro-inst-variables/pro-inst-variables.service';
import { ProcessDefinitionModule } from '../process-definition/process-definition.module';
import { ProcessInstanceModule } from '../process-instance/process-instance.module';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { TenantService } from '../tenants/tenants.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [
    // TypeOrmModule.forFeature([Task, ProInstVariable]),
    forwardRef(() => ProInstVariablesModule),
    forwardRef(() => EngineModule),
    forwardRef(() => ProcessDefinitionModule),
    forwardRef(() => ProcessInstanceModule),
    RestServiceModule,
    HttpModule,
  ],
  exports: [TaskService],
  controllers: [TaskController],
  providers: [
    TaskService,
    ProInstVariablesService,
    ProgramOrchestrationService,
    RestService,
    LoggerService,
    TenantService,
  ],
})
export class TaskModule {}
