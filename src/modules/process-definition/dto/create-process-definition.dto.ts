import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';

export class CreateProcessDefinitionDto extends FilterQueryDto {
  @ApiProperty({ description: 'Process name', example: 'Loan Approval Flow' })
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Unique key for the process',
    example: 'loan_approval',
    required: false,
  })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ description: 'Raw BPMN XML string', required: false })
  @IsString()
  @IsOptional()
  bpmn_xml?: string;

  @ApiProperty({
    description: 'Optional description of the process',
    example: 'Handles loan application approval',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'User who deployed the process',
    example: 'admin@company.com',
  })
  @IsOptional()
  @IsString()
  deployed_by?: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_subprocess?: boolean;
}
