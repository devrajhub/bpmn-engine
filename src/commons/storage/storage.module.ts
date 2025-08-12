import { Module } from '@nestjs/common';
import { S3UploadService } from './aws-s3-upload.service';

@Module({
  providers: [S3UploadService],
  exports: [S3UploadService],
})
export class StorageModule {}
