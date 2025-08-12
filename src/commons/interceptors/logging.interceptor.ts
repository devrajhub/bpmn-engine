import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const now = Date.now();

    const isProduction = process.env.NODE_ENV != 'DEV';

    this.logger.debug('REQ BODY ' + JSON.stringify(req.body));

    const logMessage =
      `METHOD - ${req.method} | URL - ${req.url} | ` +
      (!isProduction
        ? ''
        : `QUERY - ${JSON.stringify(req.query)} | PARAMS - ${JSON.stringify(req.params)} | REQ BODY - ${JSON.stringify(req.body)} `);

    this.logger.debug(logMessage);

    return next.handle().pipe(
      tap((responseBody) => {
        const logMessage =
          `RES BODY - ${JSON.stringify(responseBody)} ` +
          `${this.getColorizedStatusCode(res.statusCode)}, execution time :  ${Date.now() - now} ms`;

        this.logger.log(logMessage);
      }),
      catchError((error) => {
        const logMessage =
          `RES BODY - ${JSON.stringify(error.stack)} ` +
          `${this.getColorizedStatusCode(res.statusCode)}, exeution time :  ${Date.now() - now} ms`;

        this.logger.log(logMessage);
        throw error;
      }),
    );
  }

  private getColorizedStatusCode(statusCode: number): string {
    const yellow = '\x1b[33m';
    const reset = '\x1b[0m';
    return `${yellow}status Code : ${statusCode}${reset}`;
  }
}
