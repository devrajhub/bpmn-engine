import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ContextService } from '../context-service/context.service';

@Injectable()
export class LoggerService {
  private readonly logger: winston.Logger;
  private readonly microserviceName = process.env.MICROSERVICE_NAME;

  constructor(private readonly contextService: ContextService) {
    const enabledLogLevels = process.env.LOG_LEVELS?.split(',').map((l) =>
      l.trim(),
    ) ?? ['info', 'error'];

    const transports: winston.transport[] = [];

    // Optional console logging
    if (process.env.LOG_TO_CONSOLE !== 'false') {
      transports.push(new winston.transports.Console());
    }

    enabledLogLevels.forEach((level) => {
      transports.push(
        new DailyRotateFile({
          level,
          dirname: 'logs',
          filename: `${level}-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxFiles: '14d',
        }),
        new DailyRotateFile({
          level,
          dirname: 'logs',
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxFiles: '14d',
        }),
      );
    });

    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          const safeTimestamp =
            typeof timestamp === 'string'
              ? timestamp
              : new Date().toISOString();

          let safeMessage: string;
          if (
            message &&
            typeof message === 'object' &&
            !(message instanceof String)
          ) {
            safeMessage = JSON.stringify(message, null, 2);
          } else if (typeof message === 'string') {
            safeMessage = message;
          } else {
            safeMessage = JSON.stringify(message, null, 2);
          }

          return `[${safeTimestamp}] ${level.toUpperCase()}: ${safeMessage}`;
        }),
      ),
      transports,
    });
  }

  error(file: string, message: string | object, trace?: string) {
    const correlationId = this.contextService.getCorrelationId();
    const methodName = this.contextService.getMethodName();
    const log = this.formatStructuredMessage(
      message,
      file,
      methodName,
      correlationId,
    );
    const traceInfo = trace ? ` | Trace: ${trace}` : '';
    this.logger.error(log + traceInfo);
  }

  warn(file: string, message: string | object) {
    const correlationId = this.contextService.getCorrelationId();
    const methodName = this.contextService.getMethodName();
    this.logger.warn(
      this.formatStructuredMessage(message, file, methodName, correlationId),
    );
  }

  info(file: string, message: string | object) {
    const correlationId = this.contextService.getCorrelationId();
    const methodName = this.contextService.getMethodName();
    this.logger.info(
      this.formatStructuredMessage(message, file, methodName, correlationId),
    );
  }

  debug(file: string, message: string | object) {
    const correlationId = this.contextService.getCorrelationId();
    const methodName = this.contextService.getMethodName();
    this.logger.debug(
      this.formatStructuredMessage(message, file, methodName, correlationId),
    );
  }

  private formatStructuredMessage(
    message: string | object,
    file: string,
    method: string,
    correlationId: string,
  ): string {
    const cleanMessage = this.stringifyMessage(message);
    return `${this.microserviceName}:${correlationId}:${file}/${method} - ${cleanMessage}`;
  }

  private stringifyMessage(message: string | object): string {
    if (typeof message === 'string') return message;
    return JSON.stringify(message, null, 2);
  }
}
