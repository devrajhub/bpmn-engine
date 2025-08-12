import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    example: 'NABL',
    description: 'The name of the tenant. It must be a non-empty string.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: true,
    description: 'Indicates whether the tenant is active.',
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;

  @ApiProperty({
    example: false,
    description: 'Indicates whether the tenant is deleted.',
  })
  @IsBoolean()
  @IsOptional()
  is_deleted?: boolean = false;

  @ApiProperty({
    example: false,
    description: 'Indicates whether the tenant is suspended.',
  })
  @IsBoolean()
  @IsOptional()
  is_suspended?: boolean = false;
}
