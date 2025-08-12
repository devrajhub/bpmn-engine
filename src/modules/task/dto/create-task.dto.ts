import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from 'src/commons/enums/common-enum';
import { CommonMethods } from 'src/commons/utils/common-methods';

export class CreateTaskDto {
  @ApiProperty({
    example: '1001',
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  @IsOptional()
  task_definition_key?: string;

  @ApiProperty({
    example: 1,
  })
  @IsOptional()
  process_instance_id?: string;

  @ApiProperty({
    example: '1001',
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  assignee?: string;

  @ApiProperty({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  candidate_groups?: string[];

  @ApiProperty({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  candidate_users?: string[];

  @ApiProperty()
  variables?: Record<string, any>;

  @ApiProperty({
    example: '1001',
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  @IsOptional()
  business_key?: string;

  @ApiProperty({
    example: '1001',
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  @IsOptional()
  form_key?: string;

  @ApiProperty({
    example: 1001,
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  @IsOptional()
  priority?: number;

  @ApiProperty()
  @IsOptional()
  due_date?: Date;

  @ApiProperty({
    example: '1001',
  })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('TSK_1001') })
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: TaskStatus.PENDING,
    description:
      'The type of task status, either pending, claimed or completed',
  })
  @IsEnum(TaskStatus, {
    message: CommonMethods.getErrorMsgCombinedString('TSK_1002'),
  })
  @IsOptional()
  status?: TaskStatus;
}
