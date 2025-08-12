import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from 'src/commons/logger/logger.service';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { UserService } from './user.service';

@Module({
  imports: [HttpModule, RestServiceModule],
  controllers: [],
  providers: [UserService, LoggerService, JwtService],
})
export class UserModule {}
