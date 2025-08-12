import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorResponseDto } from '../dtos/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const { message: errMsg, stack: errStack, name: errName } = exception;
    console.log('errMsg', errMsg);
    console.log('errStack', errStack);
    console.log('errName', errName);

    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    if (exception instanceof HttpException) {
      const errorRes = exception.getResponse();

      res.statusCode = exception.getStatus();

      let message =
        typeof errorRes === 'object' && typeof errorRes['message'] === 'object'
          ? errorRes['message'][0]
          : errorRes['message'];
      if (typeof message == 'string' && !message.includes(':')) {
        if (message.includes('Cannot') && errName === 'NotFoundException') {
          `message = E_0000: Resource not found`;
        } else {
          message = `E_0000:${message}`;
        }
      }
      const errorResponseDto: ErrorResponseDto =
        ErrorResponseDto.getResponseObject(
          null,
          message.split(':')[1],
          message.split(':')[0],
        );
      res.json(errorResponseDto);

      return;
    }

    res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const env = process.env.ENV;
    const isErrStackWhitelisted = ['LOCAL', 'DEV', 'QA'].includes(env);
    const errorResponseDto: ErrorResponseDto =
      ErrorResponseDto.getResponseObject(
        null,
        isErrStackWhitelisted ? errStack : 'Something went wrong',
        'E_1000',
      );
    res.json(errorResponseDto);

    return;

    res.json({ error: exception.name, message: exception.stack });
  }
}
