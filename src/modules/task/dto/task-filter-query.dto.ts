import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { TaskStatus } from 'src/commons/enums/common-enum';
import { FindOperator } from 'typeorm';

export class TaskFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  process_instance_id?: string | FindOperator<string>;

  @ApiProperty({ required: false })
  @IsOptional()
  status?: TaskStatus | FindOperator<string>;
}
