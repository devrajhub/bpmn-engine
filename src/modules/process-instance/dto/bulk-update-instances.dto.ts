import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';

export class BulkUpdateInstanceItemDto {
  @ApiProperty()
  @IsNotEmpty()
  process_instance_id: string;

  @ApiProperty()
  @IsNotEmpty()
  data: Record<string, any>;
}

export class BulkUpdateInstancesDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateInstanceItemDto)
  instances: BulkUpdateInstanceItemDto[];
}
