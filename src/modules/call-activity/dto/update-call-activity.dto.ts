import { PartialType } from '@nestjs/swagger';
import { CreateCallActivityDto } from './create-call-activity.dto';

export class UpdateCallActivityDto extends PartialType(CreateCallActivityDto) {}
