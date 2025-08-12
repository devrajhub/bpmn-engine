import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProcessInstance } from 'src/modules/process-instance/entities/process-instance.entity';

export class CreateProInstVariableDto {
  @ApiProperty({
    example: 'approvalStatus',
    description: 'Key of the process instance variable',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'approved',
    description: 'Value of the process instance variable',
  })
  @IsDefined()
  value: any;

  @ApiProperty({
    example: 'string',
    description:
      'Data type of the variable value (e.g., string, number, boolean)',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Associated process instance object' })
  @ValidateNested()
  @Type(() => ProcessInstance)
  @IsDefined()
  process_instance: ProcessInstance;

  @ApiPropertyOptional({
    example: 'task123',
    description: 'Optional task ID associated with the variable',
  })
  @IsOptional()
  @IsString()
  task_id?: string;

  @ApiPropertyOptional({
    example: 'uuid',
    description: 'Optional task definition ID',
  })
  @IsOptional()
  @IsString()
  task_def_id?: string;

  @ApiProperty({
    example: 1,
  })
  @IsOptional()
  parent_process_instance_id?: string;

  @ApiProperty({
    example: 1,
  })
  @IsOptional()
  root_instance_id?: string;
}
