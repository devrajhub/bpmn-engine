import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common'; // ✅ Add forwardRef
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { RestService } from 'src/commons/rest-service/rest.service';
import { CallActivityModule } from '../call-activity/call-activity.module';
import { DmnModule } from '../dmn/dmn.module';
import { DmnParser } from '../dmn/engine/dmn.parser';
import { ProInstVariablesModule } from '../pro-inst-variables/pro-inst-variables.module';
import { ProcessDefinitionModule } from '../process-definition/process-definition.module';
import { ProcessInstanceModule } from '../process-instance/process-instance.module';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { TaskModule } from '../task/task.module';
import { UserService } from '../user/user.service';
import { EngineService } from './engine.service';
import { ExclusiveGatewayHandler } from './gateway-handlers/exclusive-gateway.handler';
import { BpmnParser } from './parser/bpmn.parser';
import { BusinessRuleTaskHandler } from './task-handlers/business-rule-task.handler';
import { CallActivityTaskHandler } from './task-handlers/call-activity-task.handler';
import { MultiInstanceTaskHandler } from './task-handlers/multi-instance-task.handler';
import { ServiceTaskHandler } from './task-handlers/service-task.handler';
import { SubprocessTaskHandler } from './task-handlers/subprocess-task.handler';
import { UserTaskHandler } from './task-handlers/user-task.handler';

@Module({
  imports: [
    forwardRef(() => ProcessDefinitionModule),
    forwardRef(() => TaskModule),
    forwardRef(() => ProcessInstanceModule),
    RestServiceModule,
    forwardRef(() => ProInstVariablesModule),
    forwardRef(() => CallActivityModule),
    DmnModule,
    HttpModule,
  ],
  providers: [
    EngineService,
    ServiceTaskHandler,
    UserTaskHandler,
    ExclusiveGatewayHandler,
    MultiInstanceTaskHandler,
    BpmnParser,
    CallActivityTaskHandler,
    UserService,
    SubprocessTaskHandler,
    BusinessRuleTaskHandler,
    DmnParser,
    ProgramOrchestrationService,
    RestService,
    LoggerService,
  ],
  exports: [EngineService, BpmnParser],
})
export class EngineModule {}
