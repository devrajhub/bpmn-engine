import { DataSource } from 'typeorm';

export interface IJwt {
  isAdmin: boolean;
  sub: string;
  permission_ids: string;
  role: string;
  dataSource: DataSource;
  host: string;
  authorization: string;
}
