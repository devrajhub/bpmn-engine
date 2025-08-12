import { Injectable } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { SseService } from '../sse/sse.service';
import { UuidBaseEntity } from '../models/uuid.base.entity';

@Injectable()
export class SseSubscriber
  implements EntitySubscriberInterface<UuidBaseEntity>
{
  constructor(private readonly sseService: SseService) {}

  async afterInsert(event: InsertEvent<UuidBaseEntity>) {
    const entityName = event.metadata.targetName;

    // Check if the entity is either Attendance or Visitor
    if (entityName === 'Attendance' || entityName === 'Visitor') {
      this.sseService.sendEvent({
        action: 'INSERT',
        entityName: entityName,
      });
    }
  }

  async afterUpdate(event: UpdateEvent<UuidBaseEntity>) {
    const entityName = event.metadata.targetName;

    // Check if the entity is either Attendance or Visitor
    if (entityName === 'Attendance' || entityName === 'Visitor') {
      this.sseService.sendEvent({
        action: 'UPDATE',
        entityName: event.metadata.targetName,
      });
    }
  }

  async afterRemove(event: RemoveEvent<UuidBaseEntity>) {
    const entityName = event.metadata.targetName;

    if (entityName === 'Attendance' || entityName === 'Visitor') {
      this.sseService.sendEvent({
        action: 'DELETE',
        entityName: event.metadata.targetName,
      });
    }
  }
}
