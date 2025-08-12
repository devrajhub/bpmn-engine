import { Test, TestingModule } from '@nestjs/testing';
import { AnyOtherModuleService } from './any-other-module.service';

describe('AnyOtherModuleService', () => {
  let service: AnyOtherModuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnyOtherModuleService],
    }).compile();

    service = module.get<AnyOtherModuleService>(AnyOtherModuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be connected', () => {
    expect(service.isConnected).toBeTruthy();
  });
});
