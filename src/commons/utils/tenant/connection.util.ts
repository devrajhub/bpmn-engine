import { NotFoundException } from '@nestjs/common';
import { BaseEntitySubscriber } from 'src/commons/subscribers/audit.subscriber';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { CommonMethods } from '../common-methods';
import { join } from 'path';

const dataSourcePool: Record<string, DataSource> = {};

export async function tenantSchemaConnection(
  subdomain: string,
): Promise<DataSource> {
  if (dataSourcePool[subdomain]) return dataSourcePool[subdomain];

  const newDataSource = new DataSource({
    type: 'postgres',
    url: process.env.POSTGRES_DB_URI,
    schema: 'nabl', //subdomain
    entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    synchronize: true,
    logging: true,
    subscribers: [BaseEntitySubscriber],
    namingStrategy: new SnakeNamingStrategy(),
  });

  try {
    await newDataSource.initialize();
    dataSourcePool[subdomain] = newDataSource;
    return newDataSource;
  } catch (error) {
    console.error(
      `Failed to initialize data source for schema '${subdomain}':`,
      error?.message ?? error,
    );

    if (error?.message?.includes('does not exist')) {
      throw new NotFoundException(
        `${CommonMethods.getErrorMsg('DB_1001')} '${subdomain}'`,
      );
    }

    throw new Error(`${CommonMethods.getErrorMsg('DB_1002')} '${subdomain}'.`);
  }
}
