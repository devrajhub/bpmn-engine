import { Test, TestingModule } from '@nestjs/testing';
import { DmnService } from './dmn.service';

describe('DmnService', () => {
  let service: DmnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DmnService],
    }).compile();

    service = module.get<DmnService>(DmnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
