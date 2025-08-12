import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/commons/decorators';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async checkHealth() {
    const result = await this.healthService.check();
    return SuccessResponseDto.getResponseObject(
      result,
      'Health check successful',
      null,
    );
  }
}
