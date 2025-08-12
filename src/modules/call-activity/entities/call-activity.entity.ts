import { CommonEntity } from 'src/commons/models/base.entity';
import { ProcessInstance } from 'src/modules/process-instance/entities/process-instance.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('wel_call_activity')
export class CallActivity extends CommonEntity {
  @Column({ nullable: true })
  root_instance_id: string;

  @Column()
  parent_process_instance_id: string;

  @Column()
  child_process_instance_id: string;

  @Column()
  call_activity_id: string;

  @Column({ nullable: true })
  call_activity_name?: string;

  @Column({ nullable: true })
  status?: string;

  @ManyToOne(() => ProcessInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_process_instance_id' })
  parent_process_instance: ProcessInstance;
}
