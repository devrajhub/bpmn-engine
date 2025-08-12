import { CommonEntity } from 'src/commons/models/base.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('wel_process_definitions')
@Unique(['key', 'tenant_id', 'version'])
export class ProcessDefinition extends CommonEntity {
  @Column()
  name: string;

  @Column({ nullable: true }) ///need to remove(nullable: true ) after Demo
  key: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'text' })
  bpmn_xml: string;

  @Column({ type: 'boolean', default: true })
  is_latest: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tasks: any;

  @Column({ type: 'jsonb', nullable: true })
  sequence_flows: any;

  @Column({ nullable: true })
  description?: string;

  @Column()
  tenant_id: number;

  @Column({ nullable: true })
  deployed_by?: string;

  @Column({ type: 'timestamp', nullable: true })
  deployed_at?: Date;

  @Column({ nullable: true, default: false })
  is_subprocess: boolean;
}
