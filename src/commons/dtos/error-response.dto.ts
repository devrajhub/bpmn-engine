import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty()
  data: object;
  @ApiProperty()
  message: string;
  @ApiProperty()
  code: string;
  @ApiProperty()
  timestamp: string;

  static getResponseObject(
    dataPassed: object,
    messagePassed: string,
    codePassed: string,
  ) {
    const errorResponseDto: ErrorResponseDto = new ErrorResponseDto();
    errorResponseDto.data = dataPassed;
    errorResponseDto.message = messagePassed;
    errorResponseDto.code = codePassed;
    errorResponseDto.timestamp = new Date().toISOString();
    return errorResponseDto;
  }
  static getFilledResponseObjectFromDataAndMessage(
    dataPassed: object,
    messagePassed: string,
  ): ErrorResponseDto {
    return this.getResponseObject(dataPassed, messagePassed, null);
  }
  static getFilledResponseObjectFromData(dataPassed: object): ErrorResponseDto {
    return this.getFilledResponseObjectFromDataAndMessage(
      dataPassed,
      'Success',
    );
  }
}
