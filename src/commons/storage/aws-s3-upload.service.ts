import {
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
} from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationConstants } from '../constants/application.constant';
import { LoggerService } from '../logger/logger.service';
import { CommonMethods } from '../utils/common-methods';

@Injectable()
export class S3UploadService {
  private s3Config: object;
  private S3: any;
  private readonly className = S3UploadService.name;
  constructor(private readonly loggerService: LoggerService) {
    this.s3Config = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION,
    };
    this.S3 = new AWS.S3(this.s3Config);
  }

  async uploadS3(file: any, params: any, useOriginalFileName?: boolean) {
    try {
      if (!file) {
        throw new NotAcceptableException(CommonMethods.getErrorMsg('S3_1001'));
      }

      if (!params?.userId) {
        params['userId'] = uuidv4();
      }

      const attributeName = params['attribute'];

      const ext = file.originalname.split('.').pop();
      let modifiedOriginalname =
        file.originalname.replace(/[^a-zA-Z ]/g, '') + Date.now();
      modifiedOriginalname += '.' + ext;

      const fileName =
        params.userId + '/' + attributeName + '/' + modifiedOriginalname;
      const response = this.S3.upload({
        Bucket: process.env.S3_BUCKET,
        ACL: 'private',
        Key: useOriginalFileName ? file.originalname : fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }).promise();
      const data = await response;

      return {
        type: file.mimetype,
        name: file.originalname,
        url: data.Location,
        key: data.Key,
      };
    } catch (err) {
      if (err.response) {
        throw new NotAcceptableException(err.response.message);
      }
      throw new InternalServerErrorException(
        CommonMethods.getErrorMsg('S3_1002'),
      );
    }
  }

  async uploadProfileImage(buffer: Buffer, params: any): Promise<any> {
    try {
      if (!buffer) {
        throw new NotAcceptableException(CommonMethods.getErrorMsg('S3_1001'));
      }
      const mimeType = params['mimeType'];
      const fileName = params['fileName'];
      const response = this.S3.upload({
        Bucket: process.env.S3_BUCKET,
        ACL: 'private',
        Key: fileName,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: mimeType,
      }).promise();
      const data = await response;

      return {
        type: mimeType,
        name: fileName,
        url: data.Location,
        key: data.Key,
      };
    } catch (err) {
      if (err.response) {
        throw new NotAcceptableException(err.response.message);
      }
      throw new InternalServerErrorException(
        CommonMethods.getErrorMsg('S3_1002'),
      );
    }
  }

  async getSignedUrls(files: string[]): Promise<any> {
    try {
      if (!files || files.length == 0) {
        throw new NotAcceptableException(CommonMethods.getErrorMsg('S3_1001'));
      }
      const promises = [];
      for (let aFile of files) {
        if (aFile.indexOf(ApplicationConstants.S3_FILE_SEPARATOR_KEY) > -1) {
          aFile = aFile.split(ApplicationConstants.S3_FILE_SEPARATOR_KEY)[1];
        }
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: aFile,
          Expires: process.env.S3_SIGNED_URL_EXPIRY,
        };
        promises.push(this.S3.getSignedUrlPromise('getObject', params));
      }
      const result = await Promise.allSettled(promises);
      return result.map((aVal) => aVal['value']);
    } catch (err) {
      this.loggerService.error(
        this.className,
        'getSignedUrls',
        'error while generating signed urls >>' + err,
      );
      if (err.response) {
        throw new NotAcceptableException(err.response.message);
      }
      throw new InternalServerErrorException(
        CommonMethods.getErrorMsg('S3_1002'),
      );
    }
  }
}
