import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RestService } from './rest.service';

@Module({
  imports: [HttpModule],
  providers: [RestService],
  exports: [RestService],
})
export class RestServiceModule {}
