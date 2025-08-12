import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class ProcessModuleFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: true })
  @IsNumber()
  tenant_id?: number | FindOperator<number>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  created_by?: string | FindOperator<string>;
}
