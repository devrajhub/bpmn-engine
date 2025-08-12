import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class ContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<
    Map<string, any>
  >();

  run(callback: (...args: any[]) => void, data: Record<string, any>) {
    const store = new Map(Object.entries(data));
    this.asyncLocalStorage.run(store, callback);
  }

  get(key: string): any {
    const store = this.asyncLocalStorage.getStore();
    return store?.get(key);
  }

  getCorrelationId(): string {
    return this.get('correlationId') ?? 'no-correlation-id';
  }

  getMethodName(): string {
    return this.get('methodName') ?? 'no-method-name';
  }

  getSubdomain(): string {
    return this.get('subdomain') ?? 'UNKNOWN';
  }

  getHost(): string {
    return this.get('host') ?? 'UNKNOWN';
  }
}
