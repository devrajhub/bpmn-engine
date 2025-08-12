import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class BulkFetchInstancesDto {
  @IsArray()
  @IsString({ each: true })
  instance_ids: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  relations?: string[];

  @IsOptional()
  @IsObject()
  projectionColumns?: string[] | Record<string, boolean>;
}
