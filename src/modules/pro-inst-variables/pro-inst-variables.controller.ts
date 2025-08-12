import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CreateProInstVariableDto } from './dto/create-pro-inst-variable.dto';
import { ProInstVariablesService } from './pro-inst-variables.service';

@ApiBearerAuth()
@ApiTags('Process Instance Variables')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/pro-inst-variables',
})
export class ProInstVariablesController {
  constructor(
    private readonly proInstVariablesService: ProInstVariablesService,
  ) {}

  @Post()
  create(
    @JWT() jwt: IJwt,
    @Body() createProInstVariableDto: CreateProInstVariableDto,
  ) {
    return this.proInstVariablesService.create(
      jwt.dataSource,
      createProInstVariableDto,
    );
  }

  @Get(':process_instance_id')
  async findOne(
    @JWT() jwt: IJwt,
    @Param('process_instance_id') process_instance_id: string,
  ) {
    return this.proInstVariablesService.findOneByProcessInstanceId(
      jwt.dataSource,
      process_instance_id,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proInstVariablesService.remove(+id);
  }
}
