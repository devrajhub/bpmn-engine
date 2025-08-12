import { BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplicationConstants } from '../constants/application.constant';
import { ErrorResponseDto } from '../dtos/error-response.dto';

export async function validateAndTransformDto<T extends Record<string, any>>(
  dtoClass: new () => T,
  inputDto: T,
): Promise<T> {
  for (const key in inputDto) {
    if (typeof inputDto[key] === ApplicationConstants.STRING) {
      inputDto[key] = inputDto[key].trim();
    }
  }
  const validatedDto = plainToClass(dtoClass, inputDto);
  const errors = await validate(validatedDto);

  function getErrorObjectFromValidationErrorMessage(
    messagesWithCode: string[],
  ) {
    const messageWithCode: string = messagesWithCode[0];
    const code = messageWithCode
      .split(ApplicationConstants.SEPARATOR_SYMBOL)[0]
      .trim();
    const message = messageWithCode
      .split(ApplicationConstants.SEPARATOR_SYMBOL)[1]
      .trim();
    const debugData: string[] =
      process.env.NODE_ENV != ApplicationConstants.PROD_ENVIRONMENT_KEY
        ? messagesWithCode
        : null;
    return ErrorResponseDto.getResponseObject(debugData, message, code);
  }

  if (errors.length > 0) {
    const errorMessages = errors.map(
      (error) => error.constraints[Object.keys(error.constraints)[0]],
    );
    const errorObject = getErrorObjectFromValidationErrorMessage(errorMessages);
    throw new BadRequestException(errorObject);
  }

  return validatedDto;
}
