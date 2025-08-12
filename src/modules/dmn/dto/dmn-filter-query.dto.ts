import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class DmnFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: true })
  @IsNumber()
  tenant_id?: number | FindOperator<number>;
}
