import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { PaginationDTO } from './pagination.dto';

export class CommonQueryDTO extends PaginationDTO {
  @ApiProperty({
    required: true,
    example: 1695564000000,
    description: 'Start date timestamp for filtering',
  })
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @IsNumber()
  fromDate: number;

  @ApiProperty({
    required: true,
    example: 1698156000000,
    description: 'End date timestamp for filtering visitors',
  })
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @IsNumber()
  toDate: number;
}
