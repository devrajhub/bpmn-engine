import { Test, TestingModule } from '@nestjs/testing';
import { S3UploadService } from './aws-s3-upload.service';
import { NotAcceptableException } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { CommonMethods } from '../utils/common-methods';

jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      upload: jest.fn().mockReturnThis(),
      promise: jest.fn(),
    })),
  };
});
describe('S3UploadService', () => {
  let service: S3UploadService;
  let mockS3: S3;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3UploadService,
        {
          provide: 'S3',
          useValue: mockS3,
        },
      ],
    }).compile();

    service = module.get<S3UploadService>(S3UploadService);
    mockS3 = new S3();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw an error if file is not provided', async () => {
    await expect(service.uploadS3(null, {})).rejects.toThrow(
      new NotAcceptableException(CommonMethods.getErrorMsg('S3_1001')),
    );
  });

  it('should throw an error if the buffer is null', async () => {
    const buffer = null;
    const params = {
      mimeType: 'image/jpeg',
      fileName: 'test.jpg',
    };
    await expect(service.uploadProfileImage(buffer, params)).rejects.toThrow(
      new NotAcceptableException(CommonMethods.getErrorMsg('S3_1001')),
    );
  });
});
