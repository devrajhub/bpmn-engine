import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RollbackProcessDefinitionDto {
  @ApiProperty({
    example: '1001',
  })
  @IsUUID()
  current_process_definition_id: string;

  @ApiProperty({
    example: '1001',
  })
  @IsUUID()
  process_definition_id_to_deploy: string;
}
