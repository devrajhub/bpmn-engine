import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestService } from 'src/commons/rest-service/rest.service';
import { UpdateWebHookDto } from './dto/webhook.dto';
@Injectable()
export class ProgramOrchestrationService {
  private readonly className = ProgramOrchestrationService.name;
  constructor(
    private readonly logger: LoggerService,
    private readonly restService: RestService,
    private readonly configService: ConfigService,
  ) {}

  async handleWorkflowUpdate(
    dto: UpdateWebHookDto,
    tenant_id: number,
    jwt: IJwt,
  ) {
    const { authorization } = jwt;
    const { type, update } = dto;
    this.logger.debug(
      this.className,

      `[handleWorkflowUpdate] Called with type: ${type}, update: ${JSON.stringify(update)}`,
    );
    const url = `${this.configService.get(
      'PROGRAM_ORCHESTRATION_SERVICE_END_POINT',
    )}/api/v1/tenant/${tenant_id}/user-tasks/webhook-update`;

    const payload = dto;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `${authorization}`,
      Host: jwt.host,
    };

    this.logger.debug(
      this.className,
      `[ProgramOrchestrationService] Updating Webhook with payload:${JSON.stringify(headers)}, ${url},${JSON.stringify(payload)}`,
    );
    const responseData = await this.restService.post(url, payload, { headers });

    this.logger.debug(
      this.className,
      `[ProgramOrchestrationService] Process started: ${JSON.stringify(responseData)}`,
    );

    return responseData;
  }
}
