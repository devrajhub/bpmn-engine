import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
} from '@nestjs/common';
import * as mime from 'mime';
import { S3UploadService } from '../storage/aws-s3-upload.service';
import { CommonMethods } from '../utils/common-methods';

@Injectable()
export class ExternalUtilsService {
  constructor(private s3UploadService: S3UploadService) {}

  async fileUpload(file: Express.Multer.File, params: any) {
    if (file && file.size > parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE)) {
      throw new BadRequestException(CommonMethods.getErrorMsg('S3_1003'));
    }
    const fileMimeType = mime.lookup(file.originalname);
    const mimeType = params['mime'];
    if (!fileMimeType || !fileMimeType.startsWith(mimeType)) {
      throw new BadRequestException(CommonMethods.getErrorMsg('S3_1004'));
    }
    try {
      return await this.s3UploadService.uploadS3(file, params);
    } catch (err) {
      if (err.response) {
        throw new NotAcceptableException(err.response.message);
      }
      throw new InternalServerErrorException(
        CommonMethods.getErrorMsg('S3_1002'),
      );
    }
  }

  async profileImage(params: any) {
    if (params && params.uri) {
      const extension = params.uri.split(';')[0].split('/')[1];
      const buffer = Buffer.from(
        params.uri.replace(/^data:image\/\w+;base64,/, ''),
        'base64',
      );
      const fileMimeType = this.getMimeType(
        params.uri.replace(/^data:image\/\w+;base64,/, ''),
      );
      const fileNamePrefix: string = params['phone']
        ? params['phone']
        : CommonMethods.getRandomString();
      params['fileName'] =
        CommonMethods.getApplicationConstant('PROFILE_IMAGE_FOLDER') +
        fileNamePrefix +
        CommonMethods.getApplicationConstant('PROFILE_IMAGE_VERSION') +
        '.' +
        extension;
      if (
        buffer &&
        buffer.length > parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE)
      ) {
        throw new BadRequestException(CommonMethods.getErrorMsg('S3_1003'));
      }
      const mimeType = params['mime'];
      if (!fileMimeType || !fileMimeType.startsWith(mimeType)) {
        throw new BadRequestException(CommonMethods.getErrorMsg('S3_1004'));
      }
      params['mimeType'] = fileMimeType;
      try {
        return await this.s3UploadService.uploadProfileImage(buffer, params);
      } catch (err) {
        if (err.response) {
          throw new NotAcceptableException(err.response.message);
        }
        throw new InternalServerErrorException(
          CommonMethods.getErrorMsg('S3_1002'),
        );
      }
    }
  }

  async S3ImageUpload(params: any) {
    const buffer = Buffer.from(
      params.uri.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );
    const fileMimeType = this.getMimeType(
      params.uri.replace(/^data:image\/\w+;base64,/, ''),
    );

    params['fileName'] = params.filePath;

    if (buffer.length > parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE)) {
      throw new BadRequestException(CommonMethods.getErrorMsg('S3_1003'));
    }

    const mimeType = params['mime'];
    if (!fileMimeType || !fileMimeType.startsWith(mimeType)) {
      throw new BadRequestException(CommonMethods.getErrorMsg('S3_1004'));
    }
    params['mimeType'] = fileMimeType;

    try {
      return await this.s3UploadService.uploadProfileImage(buffer, params);
    } catch (err) {
      if (err.response) {
        throw new NotAcceptableException(err.response.message);
      }
      throw new InternalServerErrorException(
        CommonMethods.getErrorMsg('S3_1002'),
      );
    }
  }

  public getMimeType = (base64: string) => {
    const signatures = {
      JVBERi0: 'application/pdf',
      R0lGODdh: 'image/gif',
      R0lGODlh: 'image/gif',
      iVBORw0KGgo: 'image/png',
      '/9j/': 'image/jpg',
      UklGR: 'image/webp',
    };
    for (const sign in signatures)
      if (base64.startsWith(sign)) return signatures[sign];
  };
}
