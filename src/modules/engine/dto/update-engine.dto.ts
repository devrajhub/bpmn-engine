import { PartialType } from '@nestjs/swagger';
import { CreateEngineDto } from './create-engine.dto';

export class UpdateEngineDto extends PartialType(CreateEngineDto) {}
