import { Test, TestingModule } from '@nestjs/testing';
import { DmnController } from './dmn.controller';
import { DmnService } from './dmn.service';

describe('DmnController', () => {
  let controller: DmnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DmnController],
      providers: [DmnService],
    }).compile();

    controller = module.get<DmnController>(DmnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
