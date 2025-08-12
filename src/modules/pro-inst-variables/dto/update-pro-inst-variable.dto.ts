import { PartialType } from '@nestjs/swagger';
import { CreateProInstVariableDto } from './create-pro-inst-variable.dto';

export class UpdateProInstVariableDto extends PartialType(
  CreateProInstVariableDto,
) {}
