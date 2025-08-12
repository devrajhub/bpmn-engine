import { Module } from '@nestjs/common';
import { DmnController } from './dmn.controller';
import { DmnService } from './dmn.service';
import { DMNEngine } from './engine/dmn.engine';
import { DmnParser } from './engine/dmn.parser';

@Module({
  // imports: [TypeOrmModule.forFeature([Dmn])],
  controllers: [DmnController],
  providers: [DmnService, DmnParser, DMNEngine],
  exports: [DmnService, DMNEngine],
})
export class DmnModule {}
