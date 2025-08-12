import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExternalUtilsService } from './external-utils.service';
import { CommonMethods } from '../utils/common-methods';

@Controller({
  version: '1',
  path: 'fileUpload',
})
export class ExternalUtilsController {
  constructor(private s3Service: ExternalUtilsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('userId') userId: string,
  ): Promise<object> {
    const params: object = {
      userId: userId,
      attribute: CommonMethods.getApplicationConstant('PROFILE_IMAGE_BUCKET'),
      mime: CommonMethods.getApplicationConstant('PROFILE_IMAGE_MIME'),
    };
    return await this.s3Service.fileUpload(file, params);
  }
}
