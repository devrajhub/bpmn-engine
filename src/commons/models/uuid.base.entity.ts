import { PrimaryGeneratedColumn } from 'typeorm';
import { CommonEntity } from './base.entity';
export abstract class UuidBaseEntity extends CommonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
