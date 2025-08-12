import { NotFoundException } from '@nestjs/common';
import * as path from 'path';

import { BaseEntitySubscriber } from 'src/commons/subscribers/audit.subscriber';
import { CommonMethods } from 'src/commons/utils/common-methods';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { fetchSecrets } from './secret-manager';

const dataSourcePool: Record<string, DataSource> = {};

export async function getOrCreateSchemeConnection(
  subdomain: string,
  secretManager: string,
): Promise<DataSource> {
  secretManager = CommonMethods.updateDbSecretManagerPath(
    secretManager,
    process.env.SERVICE_NAME,
    process.env.ENV,
  );
  if (dataSourcePool[subdomain]) return dataSourcePool[subdomain];
  const secret = await fetchSecrets(secretManager, process.env.S3_REGION);
  const url = `postgres://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}`;

  const rootDir = path.resolve(__dirname, '..');

  const newDataSource = new DataSource({
    type: 'postgres',
    url: url,
    schema: secret.schema,
    entities: [path.join(rootDir, 'modules/**/entities/*.entity.{ts,js}')],
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
