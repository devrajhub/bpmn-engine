import { UuidBaseEntity } from 'src/commons/models/uuid.base.entity';
import { Column, CreateDateColumn, Entity } from 'typeorm';

@Entity('wel_audit_log')
export class AuditLog extends UuidBaseEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  action_time: Date;

  @Column({ type: 'varchar' })
  action_type: string; // 'INSERT', 'UPDATE', 'DELETE'

  @Column({ type: 'varchar' })
  entity_name: string;

  @Column({ type: 'jsonb', nullable: true })
  old_value: any;

  @Column({ type: 'jsonb', nullable: true })
  new_value: any;

  @Column({ type: 'varchar', nullable: true })
  performed_by: string;
}
