import { CommonEntity } from 'src/commons/models/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('wel_dmn')
export class Dmn extends CommonEntity {
  @Column({ type: 'text' })
  name: string;

  @Column()
  key: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ type: 'text' })
  xml: string;

  @Column({ type: 'jsonb' })
  json: any;

  @Column()
  tenant_id: number;
}
