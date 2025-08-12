// src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AnyOtherModuleService } from '../any-other-module/any-other-module.service';

import { LoggerService } from 'src/commons/logger/logger.service';
import { HealthIndicator } from './interfaces/health-indicator.interface';
import { AnyOtherHealthIndicator } from './models/any-other-health.indicator';
import { NestjsHealthIndicator } from './models/nestjs-health.indicator';
import { PostgresHealthIndicator } from './models/postgres-health.indicator';

@Injectable()
export class HealthService {
  private readonly listOfThingsToMonitor: HealthIndicator[];
  private readonly className = HealthService.name;

  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: TypeOrmHealthIndicator,
    private readonly loggerService: LoggerService,
    private readonly anyOtherService: AnyOtherModuleService,
  ) {
    this.listOfThingsToMonitor = [
      new NestjsHealthIndicator(this.http, 'https://docs.nestjs.com'),
      new AnyOtherHealthIndicator(this.anyOtherService),
      new PostgresHealthIndicator(this.db),
    ];
  }

  @HealthCheck()
  public async check() {
    try {
      this.loggerService.debug(this.className, 'Starting health check process');

      const results = await this.health.check(
        this.listOfThingsToMonitor.map((indicator) => async () => {
          try {
            const res = await indicator.isHealthy();
            this.loggerService.debug(
              this.className,
              `${indicator.name} is healthy`,
            );
            return res;
          } catch (e) {
            const message = e?.message ?? JSON.stringify(e);
            this.loggerService.warn(
              this.className,
              `${indicator.name} is unhealthy: ${message}`,
            );
            return indicator.reportUnhealthy();
          }
        }),
      );

      this.loggerService.debug(
        this.className,
        'Health check process completed',
      );
      return results;
    } catch (e) {
      const message = e?.message ?? JSON.stringify(e);
      const stack = e?.stack ?? '';
      this.loggerService.error(
        this.className,
        `Unexpected error during health check: ${message}`,
        stack,
      );
      return e.response ?? e.response ?? e;
    }
  }
}
