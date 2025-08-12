import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { getOrCreateSchemeConnection } from 'src/config/domain-scheme-connection';
import { IS_PUBLIC_KEY } from '../decorators';
import { CheckAuthDto } from '../dtos/check-auth.dto';
import { RestService } from '../rest-service/rest.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly restService: RestService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    let isValid = false;
    const req = context.switchToHttp().getRequest();
    const dto = new CheckAuthDto();

    dto.jwt = req.headers['authorization']?.split(' ')[1];
    dto.apiEndPoint = req.originalUrl;
    dto.host = req.get('host');
    dto.protocol = req.protocol;
    dto.httpMethod = req.method;
    const url = `${this.configService.get(
      'AUTH_SERVICE_END_POINT',
    )}/api/v1/auth/check-authorization`;
    try {
      const response = await this.restService.post(url, dto, {});
      if (response?.sub) {
        isValid = true;
        req.userId = response['sub'];
        req.JWT = response;
        const host = req.get('host');
        const subdomain = host.split('.')[0];
        req.JWT = {
          ...response,
          host,
          tenant: subdomain,
          dataSource: await getOrCreateSchemeConnection(
            subdomain,
            response.db_secret_manager,
          ),
          authorization: req.headers['authorization'],
        };
      }
    } catch (error) {
      if (error?.response?.data) {
        throw new HttpException(error.response.data, error.response.status);
      } else {
        throw new BadRequestException(error.message);
      }
    }
    return isValid;
  }
}
