import { TaskStatus } from 'src/commons/enums/common-enum';
import { CommonEntity } from 'src/commons/models/base.entity';
import { ProInstVariable } from 'src/modules/pro-inst-variables/entities/pro-inst-variable.entity';
import { ProcessInstance } from 'src/modules/process-instance/entities/process-instance.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('wel_tasks')
export class Task extends CommonEntity {
  @Column({ nullable: true })
  rev: number; // Revision number, yeh optimistic locking ya task changes track karne ke liye use hota hai

  @Column()
  proc_def_id: string; // BPMN Process Definition ID, jisse pata chalta hai ki task kis process ka part hai

  @Column({ nullable: true })
  parent_task_id: string;

  @Column({ nullable: true })
  owner: string;

  @Column()
  process_instance_id: string;

  @Column({ nullable: true })
  parent_process_instance_id: string;

  @Column({ nullable: true })
  root_instance_id: string;

  @Column()
  task_def_id: string; // Task ka unique ID jo process definition mein diya gaya hota hai

  @Column()
  key: string; // Task ka key (usually taskDefId ke barabar hota hai, task ko identify karne ke liye)

  @Column({ nullable: true })
  name: string; // Task ka naam, jo user ko dikhai deta hai

  @Column({ nullable: true })
  description: string; // Task ka description, jo task ke baare mein zyada information deta hai

  @Column({ nullable: true })
  assignee: string; // Task kis user ko assign kiya gaya hai

  @Column({ nullable: true })
  assignee_name: string | null;

  @Column({ type: 'timestamp', nullable: true })
  start_time?: Date; // Task ka creation time, jab task create hota hai

  @Column({ type: 'timestamp', nullable: true })
  claim_time?: Date; // Jab kisi ne task ko claim kiya ho, uska timestamp

  @Column({ type: 'timestamp', nullable: true })
  end_time?: Date; // Task complete hone ka time

  @Column({ type: 'bigint', nullable: true })
  duration?: number; // Task ke open hone aur complete hone ke beech ka duration (milliseconds mein)

  @Column({ default: TaskStatus.PENDING })
  status: TaskStatus; // Task ka current status, jaise PENDING, CLAIMED, COMPLETED, etc.

  @Column({ nullable: true })
  priority: number; // Task ki priority, higher priority wale tasks pehle honge

  @Column({ nullable: true })
  due_date?: Date; // Jab task ka due date ho, toh yeh store hota hai

  @Column({ type: 'jsonb', nullable: true })
  form_key: string[]; // Agar task ka koi UI form hai, toh iska identifier (optional)

  @Column({ nullable: true })
  tenant_id: number; // Multi-tenancy case mein, tenant ID use hota hai (optional)

  @Column({ type: 'timestamp', nullable: true })
  las_updated_time?: Date; // Last update ka timestamp, jab task ko koi update kiya gaya ho

  @Column({ type: 'jsonb', nullable: true })
  candidate_users: string[]; // ye un users ki list hai jo task ko claim kar sakte hain

  @Column({ nullable: true })
  candidate_group_id: string; // ye un groups ki id hai jo task ko claim kar sakte hain

  @Column({ nullable: true })
  form_field_validation: boolean; // Form field validation ka status (true/false)

  // ProcessInstance ke saath relation, task ek specific process instance ka part hai
  @ManyToOne(() => ProcessInstance, (instance) => instance.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_instance_id' })
  process_instance: ProcessInstance;

  @OneToMany(() => ProInstVariable, (variable) => variable.process_instance)
  variables: ProInstVariable[];
}
