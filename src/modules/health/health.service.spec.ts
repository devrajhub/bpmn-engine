import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { TerminusModule } from '@nestjs/terminus';
import { AnyOtherModuleService } from '../any-other-module/any-other-module.service';
import { HttpModule } from '@nestjs/axios';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      providers: [HealthService, AnyOtherModuleService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ok', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
  });
});
