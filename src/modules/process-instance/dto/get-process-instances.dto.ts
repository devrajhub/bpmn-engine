import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';
import { ProcessStatus } from 'src/commons/enums/common-enum';

export class GetAllInstancesDTO extends PaginationDTO {
  @ApiPropertyOptional({
    example: '',
    enum: ProcessStatus,
    description: 'Status of the process',
  })
  @IsOptional()
  @IsEnum(ProcessStatus)
  status?: ProcessStatus;

  @ApiPropertyOptional({ example: '', description: 'Process Definition ID' })
  process_definition_id?: string;
}
