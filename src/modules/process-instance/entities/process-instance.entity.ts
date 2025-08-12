import { ProcessStatus } from 'src/commons/enums/common-enum';
import { CommonEntity } from 'src/commons/models/base.entity';
import { ProInstVariable } from 'src/modules/pro-inst-variables/entities/pro-inst-variable.entity';
import { Column, CreateDateColumn, Entity, OneToMany } from 'typeorm';
import { CurrentTaskAssigneeDto } from '../dto/current-task-assignee.dto';

@Entity('wel_process_instances')
export class ProcessInstance extends CommonEntity {
  @Column()
  process_definition_id: string;

  @Column({ nullable: true })
  parent_instance_id: string;

  @Column({ nullable: true })
  root_instance_id: string;

  @Column({ nullable: true })
  subprocess_id: string;

  @Column({ nullable: true })
  subprocess_element_id: string;

  @Column('jsonb', { nullable: true })
  context: any;

  @Column('jsonb', { nullable: true })
  flow_elements: any[];

  @Column({ nullable: true, default: false })
  is_subprocess: boolean;

  @CreateDateColumn({ name: 'start_time' })
  start_time: Date;

  @Column({ type: 'timestamp', name: 'end_time', nullable: true })
  end_time?: Date;

  @Column({ nullable: true, default: 0 })
  duration?: number;

  @Column({ nullable: true })
  start_activity_id?: string;

  @Column({ nullable: true })
  end_activity_id?: string;

  @Column({ nullable: true })
  delete_reason?: string;

  @Column({ nullable: true })
  tenant_id?: number;

  @Column({ default: ProcessStatus.RUNNING })
  status: ProcessStatus;

  @Column({ nullable: true })
  current_activity_id?: string;

  @Column({ nullable: true })
  current_activity_type?: string;

  @Column({ nullable: true })
  current_activity_name?: string;

  @Column({ nullable: true })
  current_activity_key?: string;

  @Column('jsonb', { default: [], name: 'current_task_assignee' })
  current_task_assignee: CurrentTaskAssigneeDto[];

  @Column({ nullable: true })
  current_task_group?: string;

  // Stores the positions of tokens, including activity IDs and potentially local variables
  // Example: [{ activityId: 'task1', localVars: { ... } }, { activityId: 'gateway1', localVars: { ... } }]
  @Column('jsonb', { default: [], name: 'token_positions' })
  token_positions: {
    activity_id: string;
    activity_name?: string;
    activity_key?: string;
    status: 'pending' | 'running' | 'completed';
    local_variables?: Record<string, any>;
    join_count?: number;
    arrived_count?: number;
    outgoing?: string;
    incoming?: string;
    created_at: string;
    updated_at?: string;
  }[];

  @OneToMany(() => ProInstVariable, (variable) => variable.process_instance, {
    cascade: true,
    eager: false,
  })
  variables: ProInstVariable[];
}
