import { ModelType } from 'src/commons/enums/common-enum';
import { CommonEntity } from 'src/commons/models/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('wel_process_modules')
export class ProcessModule extends CommonEntity {
  @Column()
  tenant_id: number;

  @Column()
  name: string; // UI mein dikhega — jaise "Leave Approval Process"

  @Column({ unique: true }) ///need to remove(nullable: true ) after Demo
  key: string;

  @Column({ type: 'text' })
  xml: string; // BPMN XML as raw text

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  is_published: boolean; // Jab deploy karoge to true hoga

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_edited: Date;

  @Column({ default: false, nullable: true })
  is_subprocess: boolean;

  @Column()
  model_type: ModelType;
}
