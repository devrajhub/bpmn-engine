import { Test, TestingModule } from '@nestjs/testing';
import { ExternalUtilsService } from './external-utils.service';
import {
  BadRequestException,
  NotAcceptableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3UploadService } from '../storage/aws-s3-upload.service';
import { CommonMethods } from '../utils/common-methods';

describe('ExternalUtilsService', () => {
  let service: ExternalUtilsService;
  let s3UploadService: S3UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          expandVariables: true,
          envFilePath: './apps/admin-setup/.env',
        }),
      ],
      providers: [ExternalUtilsService, S3UploadService],
    }).compile();

    service = module.get<ExternalUtilsService>(ExternalUtilsService);
    s3UploadService = module.get<S3UploadService>(S3UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fileUpload', () => {
    it('should throw BadRequestException if file size is larger than max size', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) + 1000,
        originalname: 'test.jpg',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      await expect(service.fileUpload(file, params)).rejects.toThrow(
        new BadRequestException(CommonMethods.getErrorMsg('S3_1003')),
      );
    });

    it('should throw BadRequestException if file mime type is not image', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) - 1,
        originalname: 'test.txt',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      await expect(service.fileUpload(file, params)).rejects.toThrow(
        new BadRequestException(CommonMethods.getErrorMsg('S3_1004')),
      );
    });

    it('should call s3UploadService.uploadS3 with file and params if file is valid', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) - 1,
        originalname: 'test.jpg',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      const uploadS3Spy = jest
        .spyOn(s3UploadService, 'uploadS3')
        .mockResolvedValue(null);
      await service.fileUpload(file, params);
      expect(uploadS3Spy).toHaveBeenCalledWith(file, params);
    });

    it('should return the result of s3UploadService.uploadS3 if file is valid', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) - 1,
        originalname: 'test.jpg',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      const uploadS3Spy = jest
        .spyOn(s3UploadService, 'uploadS3')
        .mockResolvedValue(null);
      await service.fileUpload(file, params);
      expect(uploadS3Spy).toHaveBeenCalledWith(file, params);
    });

    it('should throw NotAcceptableException if s3UploadService.uploadS3 throws an error with response', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) - 1,
        originalname: 'test.jpg',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      const uploadS3Spy = jest
        .spyOn(s3UploadService, 'uploadS3')
        .mockRejectedValue({ response: { message: 'some-error' } });
      await expect(service.fileUpload(file, params)).rejects.toThrow(
        new NotAcceptableException('some-error'),
      );
      expect(uploadS3Spy).toHaveBeenCalledWith(file, params);
    });

    it('should throw InternalServerErrorException if s3UploadService.uploadS3 throws an error without response', async () => {
      const file = {
        size: parseInt(process.env.USER_PROFILE_IMAGE_MAX_SIZE) - 1,
        originalname: 'test.jpg',
      } as Express.Multer.File;
      const params = {
        mime: 'image',
      };
      const uploadS3Spy = jest
        .spyOn(s3UploadService, 'uploadS3')
        .mockRejectedValue(new Error());
      await expect(service.fileUpload(file, params)).rejects.toThrow(
        new InternalServerErrorException(CommonMethods.getErrorMsg('S3_1002')),
      );
      expect(uploadS3Spy).toHaveBeenCalledWith(file, params);
    });

    it('should upload profile image to S3 and return the URL', async () => {
      const params = {
        uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAeJJREFUOI2Nk79LW1EUxn/nzvN9pGhjYyOxQ6JhQRA0WIgRUyEfwf+gF0MENYTCoIIWgkZBoIiGhjWkEAqFgKAQQbSQoKg0NJFM0mF7nHt6l9ySTWd3b2bee/Nm5ty5c2eG4zh8Pt+XeZ6fZ4Zh/Mf39/cXHMepmimK4riu63g8HvL5fB7XdTqdDlarFZ/Pl8/nA9/zBEFAo1GA8/zEQqFwvA8D6/X6yKRSKCzsxM+nw+PxwOPxwO73Q6bzQa73Q6bzYa1tTXkcjkolUooFosolUooFosolUooFAooFAooFAooFAooFAooFAooFAoYDabYTab4Xa7sb29jUKhgEqlgkqlgkqlgkqlgkqlgkqlgkqlggFgwGazweVyweVyweVyweVyweVyweVyweVywXK5xGazweVyweVyweVyweVyweVyweVywdlsBqvVCo1GA4fDAbfbDbfbDbfbDbfbDbfbDbfbDYfDgcFgwGazwWazwWazwWazwWazwWazwWazwdlsBo/Hg9frhdfrhdfrhdfrhdfrhdfrhdfrhePxQD6fx2azQaPRQKPRQKPRQKPRQKPRQKPRQKPRQLlcBplMBlmWBZlMBplMBplMBplMBplMBplMBpmnKcrncLvdLvdLvdLvdLvdLvdLvdLvdLp9PpGI/HGI/HGI/HGI/HGI/HGI/HGI/HcTqdTqfTcTqdTqfTcTqdTqfTcTqdTqfTcRzHLMsyLMsyLMsyLMsyLMsyLMsyLMtymKZpmsaxrGvaxrGvaxrGvaxrGvaxrGvaxrGu63C73S73S73S73S73S73S73S73S6fT6RiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdz/AGsN4sEsvzcAAAAASUVORK5CYII=',
        phone: '1234567890',
        mime: 'image/png',
      };
      const uploadS3Spy = jest
        .spyOn(s3UploadService, 'uploadProfileImage')
        .mockResolvedValue(
          'https://s3.amazonaws.com/profile-images/1234567890v1.png',
        );
      const buffer = Buffer.from(
        params.uri.replace(/^data:image\/\w+;base64,/, ''),
        'base64',
      );
      await service.profileImage(params);

      const s3Parama = {};
      params['mimeType'] = 'image/png';
      s3Parama['fileName'] =
        CommonMethods.getApplicationConstant('PROFILE_IMAGE_FOLDER') +
        params.phone +
        CommonMethods.getApplicationConstant('PROFILE_IMAGE_VERSION') +
        '.' +
        'png';
      expect(uploadS3Spy).toHaveBeenCalledWith(buffer, params);
    });

    it('should throw BadRequestException if buffer is too large', async () => {
      const params = {
        uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAeJJREFUOI2Nk79LW1EUxn/nzvN9pGhjYyOxQ6JhQRA0WIgRUyEfwf+gF0MENYTCoIIWgkZBoIiGhjWkEAqFgKAQQbSQoKg0NJFM0mF7nHt6l9ySTWd3b2bee/Nm5ty5c2eG4zh8Pt+XeZ6fZ4Zh/Mf39/cXHMepmimK4riu63g8HvL5fB7XdTqdDlarFZ/Pl8/nA9/zBEFAo1GA8/zEQqFwvA8D6/X6yKRSKCzsxM+nw+PxwOPxwO73Q6bzQa73Q6bzYa1tTXkcjkolUooFosolUooFosolUooFAooFAooFAooFAooFAooFAooFaoYDabYTab4Xa7sb29jUKhgEqlgkqlgkqlgkqlgkqlgkqlgkqlggFgwGazweVyweVyweVyweVyweVyweVyweVywXK5xGazweVyweVyweVyweVyweVyweVywdlsBqvVCo1GA4fDAbfbDbfbDbfbDbfbDbfbDbfbDYfDgcFgwGazwWazwWazwWazwWazwWazwWazwdlsBo/Hg9frhdfrhdfrhdfrhdfrhdfrhdfrhePxQD6fx2azQaPRQKPRQKPRQKPRQKPRQKPRQKPRQLlcBplMBlmWBZlMBplMBplMBplMBplMBplMBpmnKcrncLvdLvdLvdLvdLvdLvdLvdLvdLp9PpGI/HGI/HGI/HGI/HGI/HGI/HGI/HcTqdTqfTcTqdTqfTcTqdTqfTcTqdTqfTcRzHLMsyLMsyLMsyLMsyLMsyLMsyLMtymKZpmsaxrGvaxrGvaxrGvaxrGvaxrGvaxrGu63C73S73S73S73S73S73S73S73S6fT6RiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdz/AGsN4sEsvzcAAAAASUVORK5CYII=',
        phone: '1234567890',
        mime: 'image/png',
      };
      process.env.USER_PROFILE_IMAGE_MAX_SIZE = '100';
      await expect(service.profileImage(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if mime type does not match', async () => {
      const params = {
        uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAeJJREFUOI2Nk79LW1EUxn/nzvN9pGhjYyOxQ6JhQRA0WIgRUyEfwf+gF0MENYTCoIIWgkZBoIiGhjWkEAqFgKAQQbSQoKg0NJFM0mF7nHt6l9ySTWd3b2bee/Nm5ty5c2eG4zh8Pt+XeZ6fZ4Zh/Mf39/cXHMepmimK4riu63g8HvL5fB7XdTqdDlarFZ/Pl8/nA9/zBEFAo1GA8/zEQqFwvA8D6/X6yKRSKCzsxM+nw+PxwOPxwO73Q6bzQa73Q6bzYa1tTXkcjkolUooFosolUooFosolUooFAooFAooFAooFAooFAooFAooFaoYDabYTab4Xa7sb29jUKhgEqlgkqlgkqlgkqlgkqlgkqlgkqlggFgwGazweVyweVyweVyweVyweVyweVyweVywXK5xGazweVyweVyweVyweVyweVyweVywdlsBqvVCo1GA4fDAbfbDbfbDbfbDbfbDbfbDbfbDYfDgcFgwGazwWazwWazwWazwWazwWazwWazwdlsBo/Hg9frhdfrhdfrhdfrhdfrhdfrhdfrhePxQD6fx2azQaPRQKPRQKPRQKPRQKPRQKPRQKPRQLlcBplMBlmWBZlMBplMBplMBplMBplMBplMBpmnKcrncLvdLvdLvdLvdLvdLvdLvdLvdLp9PpGI/HGI/HGI/HGI/HGI/HGI/HGI/HcTqdTqfTcTqdTqfTcTqdTqfTcTqdTqfTcRzHLMsyLMsyLMsyLMsyLMsyLMsyLMtymKZpmsaxrGvaxrGvaxrGvaxrGvaxrGvaxrGu63C73S73S73S73S73S73S73S73S6fT6RiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdxut1wuF4vFYrFYLBaLxWKxWCwWi8VisRiNRhjHcdz/AGsN4sEsvzcAAAAASUVORK5CYII=',
        phone: '1234567890',
        mime: 'application/pdf',
      };
      await expect(service.profileImage(params)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
