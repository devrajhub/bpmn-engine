import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MultiInstanceTaskHandler {
  private readonly logger = new Logger(MultiInstanceTaskHandler.name);
  async executeAll<T = any>(
    items: T[],
    executeTaskFn: (item: T, idx: number) => Promise<any>,
  ): Promise<any[]> {
    this.logger.log(`Executing multi-instance task for ${items.length} items`);
    const results = await Promise.all(
      items.map((item, idx) => executeTaskFn(item, idx)),
    );
    this.logger.log('All multi-instance tasks completed');
    return results;
  }

  async executeByCardinality(
    cardinality: number,
    executeTaskFn: (idx: number) => Promise<any>,
  ): Promise<any[]> {
    this.logger.log(
      `Executing multi-instance task for ${cardinality} instances`,
    );

    const indices = Array.from({ length: cardinality }, (_, i) => i);

    const results = await Promise.all(indices.map((idx) => executeTaskFn(idx)));
    this.logger.log('All multi-instance tasks completed');
    return results;
  }
}
