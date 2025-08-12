import { HealthIndicatorResult } from '@nestjs/terminus';
import { AnyOtherModuleService } from 'src/modules/any-other-module/any-other-module.service';
import { BaseHealthIndicator } from '../base/base-health.indicator';

export class AnyOtherHealthIndicator extends BaseHealthIndicator {
  public readonly name = 'AnyOtherCustomHealthIndicator';
  protected readonly help = 'Status of ' + this.name;

  constructor(private readonly service: AnyOtherModuleService) {
    super();
  }

  public async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = this.service.isConnected;
    return this.getStatus(isHealthy);
  }

  private getStatus(isHealthy: boolean): HealthIndicatorResult {
    return {
      [this.name]: { status: isHealthy ? 'up' : 'down' },
    };
  }
}
