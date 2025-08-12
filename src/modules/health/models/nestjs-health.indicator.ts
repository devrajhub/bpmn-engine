import { HttpHealthIndicator } from '@nestjs/terminus';
import { BaseHealthIndicator } from '../base/base-health.indicator';

export class NestjsHealthIndicator extends BaseHealthIndicator {
  public name = 'NestJS';
  protected help = 'Checks if NestJS docs site is reachable';

  constructor(
    private readonly http: HttpHealthIndicator,
    private readonly url: string,
  ) {
    super();
    this.registerGauge();
  }

  async isHealthy() {
    const result = await this.http.pingCheck(this.name, this.url);
    this.setGaugeStatus('up');
    return result;
  }
}
