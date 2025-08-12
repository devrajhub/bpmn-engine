import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RestService } from 'src/commons/rest-service/rest.service';
import { CommonMethods } from 'src/commons/utils/common-methods';

@Injectable()
export class TenantService {
  constructor(
    private readonly configService: ConfigService,
    private readonly restService: RestService,
  ) {}

  async getTenantsByIds(
    tenantIds: number[],
    host: string,
    fetch_all = false,
    domain_name?: string,
  ) {
    let response = null;
    try {
      const url = `${this.configService.get(
        'PLATFORM_SERVICE_END_POINT',
      )}/api/v1/tenants/bulk-fetch`;

      response = await this.restService.post(
        url,
        { ids: tenantIds, fetch_all, domain_name },
        {
          headers: {
            Host: host,
          },
        },
      );
    } catch (e) {
      CommonMethods.handleApiError(e);
    }
    if (!response?.data?.length) {
      throw new BadRequestException(CommonMethods.getErrorMsg('TNT_1002'));
    }
    if (response?.data?.length == 1) {
      return response?.data[0] ?? {};
    }

    return response?.data ?? [];
  }

  async getTenantSecret(host: string) {
    let response = null;
    try {
      const url = `${this.configService.get(
        'PLATFORM_SERVICE_END_POINT',
      )}/api/v1/tenants/secret?domain_name=${encodeURIComponent(host)}`;

      response = await this.restService.get(url, {
        headers: {
          Host: host,
        },
      });
    } catch (e) {
      CommonMethods.handleApiError(e);
    }

    if (!response) {
      throw new BadRequestException(CommonMethods.getErrorMsg('TNT_1002'));
    }

    return response.data ?? {};
  }
}
