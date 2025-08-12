import { Module } from '@nestjs/common';
import { CallActivityController } from './call-activity.controller';
import { CallActivityService } from './call-activity.service';

@Module({
  // imports: [TypeOrmModule.forFeature([CallActivity])],
  controllers: [CallActivityController],
  providers: [CallActivityService],
  exports: [CallActivityService],
})
export class CallActivityModule {}
