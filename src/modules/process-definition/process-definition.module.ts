import { forwardRef, Module } from '@nestjs/common';
import { EngineModule } from '../engine/engine.module';
import { ProcessDefinitionController } from './process-definition.controller';
import { ProcessDefinitionService } from './process-definition.service';

@Module({
  imports: [
    // TypeOrmModule.forFeature([ProcessDefinition]),
    forwardRef(() => EngineModule),
  ],
  exports: [ProcessDefinitionService],
  controllers: [ProcessDefinitionController],
  providers: [ProcessDefinitionService],
})
export class ProcessDefinitionModule {}
