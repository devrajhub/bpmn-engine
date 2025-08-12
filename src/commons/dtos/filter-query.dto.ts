import { ApiProperty } from '@nestjs/swagger';
import { FindOperator } from 'typeorm';

export class FilterQueryDto {
  @ApiProperty()
  id?: string | FindOperator<string>;

  @ApiProperty()
  is_active?: boolean;

  @ApiProperty()
  is_deleted?: boolean;

  @ApiProperty()
  paginate?: boolean;

  @ApiProperty()
  take?: number;

  @ApiProperty()
  skip?: number;
}
