import { PartialType } from '@nestjs/swagger';
import { CreateDmnDto } from './create-dmn.dto';

export class UpdateDmnDto extends PartialType(CreateDmnDto) {}
