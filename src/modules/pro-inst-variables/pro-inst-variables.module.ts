import { Module } from '@nestjs/common';
import { ProInstVariablesController } from './pro-inst-variables.controller';
import { ProInstVariablesService } from './pro-inst-variables.service';

@Module({
  // imports: [TypeOrmModule.forFeature([ProInstVariable])],
  controllers: [ProInstVariablesController],
  providers: [ProInstVariablesService],
  exports: [ProInstVariablesService],
})
export class ProInstVariablesModule {}
