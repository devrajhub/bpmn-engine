import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';
import { FindOperator } from 'typeorm';

export class TenantFilterQueryDto extends FilterQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  domain_name?: string | FindOperator<string>;
}

export class GetTenantsDto {
  @ApiPropertyOptional({
    description:
      'Set to true to fetch all tenants. If true, `ids` will be ignored.',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'TEN_1003: fetchAll must be a boolean value' })
  @Type(() => Boolean)
  fetch_all?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Domain name to fetch tenants for. If provided, `ids` will be ignored.',
    example: 'example.tenant.com',
  })
  @IsOptional()
  domain_name?: string;

  @ApiProperty({
    type: [Number],
    description: 'Array of tenant IDs to fetch',
    example: [1, 2, 3],
    required: false,
  })
  @ValidateIf((o) => !o.fetch_all && !o.domain_name)
  @IsArray({ message: 'TEN_1004: ids must be an array' })
  @ArrayNotEmpty({ message: 'TEN_1001: Tenant IDs array cannot be empty' })
  @Type(() => Number)
  @IsNumber(
    {},
    { each: true, message: 'TEN_1002: Each tenant ID must be a number' },
  )
  ids?: number[];
}
