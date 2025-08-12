import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class ProcessDefinitionFilterQuery extends FilterQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  version?: number | FindOperator<number>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  tenant_id?: number | FindOperator<number>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  key?: string | FindOperator<string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_subprocess?: boolean | FindOperator<boolean>;
}
