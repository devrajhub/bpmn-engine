import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
dotenv.config();
// this file is not in use utils/tenantSchemaConnection is for database connection for the application
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.POSTGRES_DB_URI,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  synchronize: true,
  schema: process.env.POSTGRES_DB_SCHEMA,
  logging: true,
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
};

export const AppDataSource = new DataSource(dataSourceOptions);
