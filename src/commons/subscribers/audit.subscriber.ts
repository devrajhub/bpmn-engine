import { RequestContext } from 'nestjs-request-context';
import { AuditLog } from 'src/modules/audit/entities/audit-log.entity';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import { UuidBaseEntity } from '../models/uuid.base.entity';

@EventSubscriber()
export class BaseEntitySubscriber
  implements EntitySubscriberInterface<UuidBaseEntity>
{
  private readonly className = BaseEntitySubscriber.name;
  constructor(private readonly loggerService: LoggerService) {}
  beforeInsert(event: InsertEvent<UuidBaseEntity>) {
    const userId = RequestContext?.currentContext?.req?.userId;
    event.entity.created_by = userId;
    event.entity.updated_by = userId;
  }

  beforeUpdate(event: UpdateEvent<UuidBaseEntity>) {
    const userId = RequestContext?.currentContext?.req?.userId;
    if (event.entity) {
      event.entity.updated_by = userId;
    }
  }

  private async createAuditLog(
    event: any,
    actionType: string,
    entityName: string,
    entityId: string,
    oldValue: any,
    newValue: any,
  ) {
    if (entityName === AuditLog.name) return;
    const userId = RequestContext?.currentContext?.req?.userId;
    const auditLog = {
      action_type: actionType,
      entity_name: entityName,
      old_value: oldValue,
      new_value: newValue,
      performed_by: userId ? userId : 'system',
    };

    try {
      const eventCreate = event.manager.create(AuditLog, auditLog);
      await event.manager.save(eventCreate);
    } catch (error) {
      this.loggerService.error(
        this.className,
        'createAuditLog',
        `Error saving audit log: ${error.stack}`,
      );
      console.error('Error saving audit log:', error);
    }
  }

  async afterInsert(event: InsertEvent<any>) {
    const entityName = event.metadata.targetName;
    const entityAfter = event.entity;
    const entityId = entityAfter?.id;

    await this.createAuditLog(
      event,
      'INSERT',
      entityName,
      entityId,
      null,
      entityAfter,
    );
  }

  async afterUpdate(event: UpdateEvent<any>) {
    const entityName = event.metadata.targetName;
    const entityBefore = event.databaseEntity;
    const entityAfter = event.entity;
    const entityId = entityAfter?.id;

    await this.createAuditLog(
      event,
      'UPDATE',
      entityName,
      entityId,
      entityBefore,
      entityAfter,
    );
  }

  // Handler for remove events
  async afterRemove(event: RemoveEvent<any>) {
    const entityName = event.metadata.targetName;
    const entityBefore = event.databaseEntity;
    const entityAfter = event.entity;
    const entityId = entityAfter?.id;

    await this.createAuditLog(
      event,
      'DELETE',
      entityName,
      entityId,
      entityBefore,
      null,
    );
  }

  //   beforeRemove(event: RemoveEvent<UuidBaseEntity>) {
  //     // Optionally handle something before removing
  //   }
}
