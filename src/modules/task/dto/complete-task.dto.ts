import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ProInstVariable } from 'src/modules/pro-inst-variables/entities/pro-inst-variable.entity';

export class CompleteTaskDTO {
  @ApiProperty()
  @IsOptional()
  asignee?: string;

  @ApiProperty()
  @IsOptional()
  variables?: ProInstVariable[];
}
