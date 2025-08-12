import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonParamDTO } from 'src/commons/dtos/get-common-param';
import { RestService } from 'src/commons/rest-service/rest.service';
import { CommonMethods } from 'src/commons/utils/common-methods';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly restService: RestService,
  ) {}

  async getByRole(
    authorizationToken: string,
    pathParams: CommonParamDTO & { code: string },
    host: string,
  ) {
    let response;
    try {
      const headers: Record<string, string> = {
        Host: host,
      };

      if (authorizationToken) {
        headers['Authorization'] = authorizationToken;
      }

      const { tenant_id, code } = pathParams;

      const url = `${this.configService.get('AUTH_SERVICE_END_POINT')}/api/v1/tenant/${tenant_id}/users/role/${code}`;
      this.logger.debug(
        UserService.name,
        `[getByRole] Fetching users by role with URL: ${url}, Headers: ${JSON.stringify(headers)}`,
      );
      response = await this.restService.get(url, { headers });
      this.logger.debug(
        UserService.name,
        `[getByRole] Response received: ${JSON.stringify(response)}`,
      );
    } catch (e) {
      CommonMethods.handleApiError(e);
    }
    if (!response?.data?.length) {
      throw new BadRequestException(CommonMethods.getErrorMsg('USR_1033'));
    }

    if (response.data.length === 1) {
      return response.data[0];
    }

    return response.data;
  }

  async getProfile(
    authorizationToken: string,
    tenant_id: number,
    user_id: string,
    host: string,
  ) {
    let response = null;
    try {
      const url = `${this.configService.get('AUTH_SERVICE_END_POINT')}/api/v1/tenant/${tenant_id}/users/${user_id}`;
      response = await this.restService.get(url, {
        headers: { Authorization: authorizationToken, Host: host },
      });
    } catch (e) {
      CommonMethods.handleApiError(e);
    }
    return response;
  }

  async updateUserPermissions(
    authorizationToken: string,
    tenant_id: number,
    user_id: string,
    permission_ids: string[],
    action: 'add' | 'remove',
    host: string,
  ) {
    const url = `${this.configService.get('AUTH_SERVICE_END_POINT')}/api/v1/tenant/${tenant_id}/users/${user_id}/permissions`;

    const headers: Record<string, string> = {
      Authorization: authorizationToken,
      Host: host,
    };

    const body = { permission_ids, action };
    let response;
    try {
      response = await this.restService.patch(url, body, { headers });
    } catch (e) {
      CommonMethods.handleApiError(e);
    }
    return response?.data;
  }

  async getAssessorProfile(
    authorizationToken: string,
    tenant_id: number,
    user_id: string,
  ) {
    let response = null;
    try {
      const url = `${this.configService.get('AUTH_SERVICE_END_POINT')}/api/v1/tenant/${tenant_id}/accessor-upload/user-details?user_id=${user_id}`;
      response = await this.restService.get(url, {
        headers: { Authorization: authorizationToken },
      });
    } catch (e) {
      CommonMethods.handleApiError(e);
    }
    return response;
  }
}
