import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { SseService } from './sse.service';

@ApiBearerAuth()
@ApiTags('SSE')
@Controller({
  version: '1',
  path: 'sse',
})
export class SseController {
  constructor(
    private sseService: SseService,
    private readonly loggerService: LoggerService,
  ) {}
  // @Public()
  // @Sse('events')
  // events(@Res() res: Response): Observable<any> {
  //   return new Observable((observer) => {
  //     const clientResponse = (data: any) => {
  //       res.write(`data: ${JSON.stringify(data)}\n\n`);
  //     };

  //     this.sseService.subscribe(clientResponse);

  //     observer.next({ message: 'Connected to SSE stream' });

  //     res.on('close', () => {
  //       this.loggerService.info('SSE connection closed');
  //       this.sseService.unsubscribe(clientResponse);
  //       observer.complete();
  //       res.end();
  //     });
  //   }).pipe(
  //     tap({
  //       next: (data) => {
  //         res.write(`data: ${JSON.stringify(data)}\n\n`);
  //       },
  //       error: (err) => {
  //         this.loggerService.error(`Error in SSE stream: ${err.message}`, err);

  //         res.write(`event: error\ndata: ${JSON.stringify(err)}\n\n`);
  //       },
  //     }),
  //   );
  // }

  //   @Sse('events')
  // sse(): Observable<any> {
  //   return interval(1000).pipe(map((_) => ({ data: { hello: 'world' } })));
  // }
}
