import { Test, TestingModule } from '@nestjs/testing';
import { RestService } from './rest.service';
import { HttpService } from '@nestjs/axios';

describe('RestServiceService', () => {
  let service: RestService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        RestService,
        {
          provide: HttpService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RestService>(RestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
