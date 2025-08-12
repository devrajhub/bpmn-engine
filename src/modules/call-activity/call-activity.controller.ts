import { Body, Controller, Post } from '@nestjs/common';
import { CallActivityService } from './call-activity.service';
import { CreateCallActivityDto } from './dto/create-call-activity.dto';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { IJwt } from 'src/commons/interface/jwt.interface';

@Controller('call-activity')
export class CallActivityController {
  constructor(private readonly callActivityService: CallActivityService) {}

  @Post()
  create(
    @JWT() jwt: IJwt,
    @Body() createCallActivityDto: CreateCallActivityDto,
  ) {
    return this.callActivityService.create(
      jwt.dataSource,
      createCallActivityDto,
    );
  }
}
