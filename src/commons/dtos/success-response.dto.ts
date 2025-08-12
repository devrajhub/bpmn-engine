import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty()
  data: object;
  @ApiProperty()
  message: string;
  @ApiProperty()
  code: string;
  @ApiProperty()
  timestamp: string;
  @ApiProperty()
  page: number;
  @ApiProperty()
  limit: number;
  @ApiProperty()
  total: number;

  static getFilledResponseObjectAllArgs(
    dataPassed: object,
    messagePassed: string,
    codePassed: string,
  ) {
    const successResponseDto: SuccessResponseDto = new SuccessResponseDto();
    successResponseDto.data = dataPassed;
    successResponseDto.message = messagePassed;
    successResponseDto.code = codePassed;
    successResponseDto.timestamp = new Date().toISOString();
    return successResponseDto;
  }
  static getFilledResponseObjectFromDataAndMessage(
    dataPassed: object,
    messagePassed: string,
  ): SuccessResponseDto {
    return this.getFilledResponseObjectAllArgs(dataPassed, messagePassed, null);
  }
  static getFilledResponseObjectFromData(
    dataPassed: object,
  ): SuccessResponseDto {
    return this.getFilledResponseObjectFromDataAndMessage(
      dataPassed,
      'Success',
    );
  }

  static getResponseObject(
    fetchedResult: any = {},
    messagePassed: string,
    codePassed: string,
    pageOff = true,
  ) {
    const successResponseDto: SuccessResponseDto = new SuccessResponseDto();
    successResponseDto.message = messagePassed;
    successResponseDto.code = codePassed || '200';
    successResponseDto.data = fetchedResult?.data || fetchedResult || {};
    successResponseDto.timestamp = new Date().toISOString();

    if (!pageOff) {
      successResponseDto.limit = parseInt(fetchedResult.limit);
      successResponseDto.page = parseInt(fetchedResult.page);
      successResponseDto.total = fetchedResult.total;
    }

    return successResponseDto;
  }
}
