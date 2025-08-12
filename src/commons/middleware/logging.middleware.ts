import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly className = LoggingMiddleware.name;
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, query } = req;

    this.loggerService.info(
      this.className,
      `Incoming Request: ${method} ${originalUrl} - Body: ${JSON.stringify(
        body,
      )} - Query: ${JSON.stringify(query)}`,
    );

    res.on('finish', () => {
      const { statusCode, statusMessage } = res;

      this.loggerService.info(
        this.className,
        `Outgoing Response: ${statusCode} ${statusMessage} - Body: ${JSON.stringify(
          res.locals.data,
        )}`,
      );
    });

    next();
  }
}
