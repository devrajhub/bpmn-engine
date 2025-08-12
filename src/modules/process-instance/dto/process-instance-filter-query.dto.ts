import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class ProInstanceFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  status?: string | FindOperator<string>;

  @ApiProperty({ required: false })
  @IsOptional()
  tenant_id?: number | FindOperator<number>;
}
