import { Module } from '@nestjs/common';
import { DmnService } from '../dmn/dmn.service';
import { DmnParser } from '../dmn/engine/dmn.parser';
import { ProcessDefinitionModule } from '../process-definition/process-definition.module';
import { ProcessModuleController } from './process-module.controller';
import { ProcessModuleService } from './process-module.service';

@Module({
  imports: [ProcessDefinitionModule],
  controllers: [ProcessModuleController],
  providers: [ProcessModuleService, DmnService, DmnParser],
})
export class ProcessModuleModule {}
