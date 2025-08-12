import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/commons/decorators';
import { GetTenantsDto } from './dto/tenant-filter.dto';
import { TenantService } from './tenants.service';
import { Domain } from 'src/commons/decorators/domain.decorator';

@ApiBearerAuth()
@ApiTags('Tenants')
@Controller({
  version: '1',
  path: 'tenants',
})
export class TenantsController {
  constructor(private readonly tenantsService: TenantService) {}

  @Public()
  @Post('bulk-fetch')
  @ApiOperation({ summary: 'Fetch tenants by IDs' })
  async getTenantsById(
    @Body() getTenantsDto: GetTenantsDto,
    @Domain() domainName: string,
  ) {
    const { ids, fetch_all, domain_name } = getTenantsDto;
    return await this.tenantsService.getTenantsByIds(
      ids,
      domainName,
      fetch_all,
      domain_name,
    );
  }
}
