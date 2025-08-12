import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';

export class GetAllProcessDefDTO extends PaginationDTO {
  @ApiPropertyOptional({
    example: '',
    description: 'Key of process definition',
  })
  key?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Is process definition latest',
  })
  is_latest?: boolean;

  @ApiPropertyOptional({
    example: '',
    description: 'Is process definition sub process',
  })
  is_subprocess?: boolean;
}
