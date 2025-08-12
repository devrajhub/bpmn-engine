import { Test, TestingModule } from '@nestjs/testing';
import { CallActivityService } from './call-activity.service';

describe('CallActivityService', () => {
  let service: CallActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CallActivityService],
    }).compile();

    service = module.get<CallActivityService>(CallActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
