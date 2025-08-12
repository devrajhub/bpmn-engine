import { Module } from '@nestjs/common';
import { LoggerService } from 'src/commons/logger/logger.service';
import { BaseEntitySubscriber } from 'src/commons/subscribers/audit.subscriber';

@Module({
  // imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [BaseEntitySubscriber, LoggerService],
})
export class AuditModule {}
