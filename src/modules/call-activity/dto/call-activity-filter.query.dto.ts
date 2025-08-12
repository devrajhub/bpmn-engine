import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class CallActivityFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  parent_process_instance_id?: string | FindOperator<string>;

  @ApiProperty({ required: false })
  @IsOptional()
  child_process_instance_id?: string | FindOperator<string>;
}
