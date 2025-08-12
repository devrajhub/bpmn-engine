import { PartialType } from '@nestjs/swagger';
import { CreateProcessDefinitionDto } from './create-process-definition.dto';

export class UpdateProcessDefinitionDto extends PartialType(
  CreateProcessDefinitionDto,
) {}
