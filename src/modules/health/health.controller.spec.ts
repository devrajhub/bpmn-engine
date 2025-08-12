import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { AnyOtherModuleService } from '../any-other-module/any-other-module.service';
import { HttpModule } from '@nestjs/axios';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [HealthService, AnyOtherModuleService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it("health should return 'ok'", async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
  });
});
