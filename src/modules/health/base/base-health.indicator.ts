import { HealthIndicatorResult } from '@nestjs/terminus';
import { Gauge } from 'prom-client';

export abstract class BaseHealthIndicator {
  public abstract name: string;
  public abstract isHealthy(): Promise<HealthIndicatorResult>;

  protected abstract help: string;
  protected readonly labelNames = ['status'];
  protected stateIsConnected = false;

  private gaugesRegistered = false;
  private gauge?: Gauge<string>;

  protected registerGauge(): void {
    if (this.gaugesRegistered) return;

    this.gauge = new Gauge({
      name: `health_${this.name.toLowerCase()}_status`,
      help: this.help,
      labelNames: this.labelNames,
    });

    this.gaugesRegistered = true;
  }

  protected setGaugeStatus(status: 'up' | 'down'): void {
    if (!this.gauge) return;
    this.gauge.set({ status }, status === 'up' ? 1 : 0);
  }

  public reportUnhealthy(): HealthIndicatorResult {
    this.setGaugeStatus('down');
    return {
      [this.name]: { status: 'down' },
    };
  }
}
