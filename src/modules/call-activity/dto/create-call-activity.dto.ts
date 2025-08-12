import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCallActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_process_instance_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  root_instance_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  child_process_instance_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_activity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  call_activity_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
