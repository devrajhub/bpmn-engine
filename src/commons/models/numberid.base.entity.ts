import { PrimaryGeneratedColumn } from 'typeorm';
export abstract class NumberIdBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
}
