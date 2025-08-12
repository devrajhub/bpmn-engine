import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';
import { TaskStatus } from 'src/commons/enums/common-enum';

export class GetAllTaskDTO extends PaginationDTO {
  @ApiPropertyOptional({ example: '', description: 'Process Instance ID' })
  process_instance_id?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Parent Process Instance ID',
  })
  parent_process_instance_id?: string;

  @ApiPropertyOptional({ example: '', description: 'Candidate Group ID' })
  candidate_group_id?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Status of the task',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activity_key?: string;
}
