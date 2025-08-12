import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RestServiceModule } from 'src/commons/rest-service/rest-service.module';
import { TenantService } from './tenants.service';

@Module({
  imports: [HttpModule, RestServiceModule],
  controllers: [],
  providers: [TenantService],
  exports: [HttpModule, RestServiceModule],
})
export class TenantsModule {}
