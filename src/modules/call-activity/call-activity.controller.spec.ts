import { Test, TestingModule } from '@nestjs/testing';
import { CallActivityController } from './call-activity.controller';
import { CallActivityService } from './call-activity.service';

describe('CallActivityController', () => {
  let controller: CallActivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallActivityController],
      providers: [CallActivityService],
    }).compile();

    controller = module.get<CallActivityController>(CallActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
