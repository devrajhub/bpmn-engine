import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ModelType } from 'src/commons/enums/common-enum';
import { CommonMethods } from 'src/commons/utils/common-methods';

export class CreateProcessModuleDto {
  @ApiProperty({
    example: 'Leave Approval Process',
    description: 'Name of the process module (shown in UI)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '',
    description: 'Key of the process module',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: '<?xml version="1.0"?><bpmn:definitions>...</bpmn:definitions>',
    description: 'Raw BPMN XML content',
  })
  @IsString()
  @IsOptional()
  xml: string;

  @ApiProperty({
    example: 'This process handles leave approval.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: false,
    description: 'Set to true when deployed',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates if process module is a subprocess',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_subprocess?: boolean;

  @ApiProperty({
    example: ModelType.BPMN,
    description: 'The type of model - bpmn or dmn',
  })
  @IsEnum(ModelType, {
    message: CommonMethods.getErrorMsgCombinedString('TSK_1002'),
  })
  @IsOptional()
  model_type?: ModelType;

  @IsOptional()
  last_edited?: Date;
}
