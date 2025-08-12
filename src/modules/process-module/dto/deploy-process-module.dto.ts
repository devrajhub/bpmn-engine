import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeployProcessModuleDto {
  @ApiProperty({
    example: 'a521f2c2-c9cc-4794-8b6f-3bc3bea807fa',
    description: 'Id of the process module to be deployed',
  })
  @IsString()
  @IsNotEmpty()
  process_module_id: string;

  @ApiProperty({
    example: 'Leave Approval Process',
    description: 'Name of the process module (shown in UI)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '',
    description: 'Key of the process module',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'This process handles leave approval.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
