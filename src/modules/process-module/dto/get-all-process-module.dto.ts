import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';
import { ModelType } from 'src/commons/enums/common-enum';

export class GetAllProcessModuleDTO extends PaginationDTO {
  @ApiPropertyOptional({
    example: '',
    description: 'ID',
    required: false,
  })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true')
  is_published?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true')
  is_subprocess?: boolean;

  @ApiPropertyOptional()
  model_type?: ModelType;
}
