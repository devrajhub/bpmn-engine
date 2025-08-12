import { CommonEntity } from 'src/commons/models/base.entity';
import { ProcessInstance } from 'src/modules/process-instance/entities/process-instance.entity';
import { Task } from 'src/modules/task/entities/task.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('wel_pro_inst_variables')
export class ProInstVariable extends CommonEntity {
  @ManyToOne(
    () => ProcessInstance,
    (process_instance) => process_instance.variables,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'current_process_instance_id' })
  process_instance: ProcessInstance;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ nullable: true })
  task_id: string;

  @Column({ nullable: true })
  parent_process_instance_id: string;

  @Column({ nullable: true })
  root_instance_id: string;

  @Column({ nullable: true })
  current_process_instance_id: string;

  @Column({ nullable: true })
  task_def_id: string;

  @Column()
  key: string;

  @Column('text')
  value: string;

  @Column({ default: 'string' }) // string, number, boolean, json
  type: string;
}
