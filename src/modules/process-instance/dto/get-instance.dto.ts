import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
export class GetInstanceQueryDTO {
  @ApiPropertyOptional({
    example: '',
    description: 'Tenant ID',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  tenant_id?: number;

  @ApiPropertyOptional({
    example: '',
    description: 'User ID who started the process',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}
