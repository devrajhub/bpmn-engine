import { Module } from '@nestjs/common';
import { ExternalUtilsController } from './external-utils.controller';
import { ExternalUtilsService } from './external-utils.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ExternalUtilsController],
  providers: [ExternalUtilsService],
  exports: [ExternalUtilsService],
})
export class ExternalUtilsModule {}
