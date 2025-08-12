import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { ContextService } from '../context-service/context.service';

@Injectable()
export class AsyncContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: ContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] ?? randomUUID();
    const methodName = req.method;
    const host = req.headers.host;
    const subdomain = host?.split('.')[0] ?? '';
    this.contextService.run(
      () => {
        next();
      },
      { correlationId, methodName, host, subdomain },
    );
  }
}
