import { PartialType } from '@nestjs/swagger';
import { CreateProcessModuleDto } from './create-process-module.dto';

export class UpdateProcessModuleDto extends PartialType(
  CreateProcessModuleDto,
) {}
