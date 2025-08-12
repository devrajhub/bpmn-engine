import { Injectable } from '@nestjs/common';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import { BaseHealthIndicator } from '../base/base-health.indicator';

@Injectable()
export class PostgresHealthIndicator extends BaseHealthIndicator {
  public name = 'PostgresDB';
  protected help = 'Checks PostgreSQL connection status';

  constructor(private readonly db: TypeOrmHealthIndicator) {
    super();
    this.registerGauge();
  }

  async isHealthy() {
    const result = await this.db.pingCheck(this.name);
    this.setGaugeStatus('up');
    return result;
  }
}
