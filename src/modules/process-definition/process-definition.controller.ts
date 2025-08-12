// src/process-definition/process-definition.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CreateProcessDefinitionDto } from './dto/create-process-definition.dto';
import { GetAllProcessDefDTO } from './dto/get-process-definition.dto';
import { RollbackProcessDefinitionDto } from './dto/rollback-process-definition.dto';
import { ProcessDefinitionService } from './process-definition.service';

@ApiBearerAuth()
@ApiTags('Process Definitions')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/process-definitions',
})
export class ProcessDefinitionController {
  private readonly logger = new Logger(ProcessDefinitionController.name);
  constructor(private readonly service: ProcessDefinitionService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async deploy(
    @Param('tenant_id') tenantId: number,
    @Body() body: CreateProcessDefinitionDto,
    @JWT() jwt: IJwt,
  ) {
    const payload = {
      ...body,
      deployed_by: jwt.sub,
    };
    return await this.service.deploy(jwt.dataSource, tenantId, payload);
  }

  @Post('rollback')
  async rollback(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenantId: number,
    @Body() body: RollbackProcessDefinitionDto,
  ) {
    return await this.service.rollback(jwt.dataSource, tenantId, body);
  }

  @Get()
  async getAll(
    @Param('tenant_id') tenantId: number,
    @Query() query: GetAllProcessDefDTO,
    @JWT() jwt: IJwt,
  ) {
    const result = await this.service.findAll(tenantId, query, jwt);
    return SuccessResponseDto.getResponseObject(
      result,
      'Success in fetching process defintions',
      null,
      query?.pageOff,
    );
  }

  @Get(':id')
  async getOne(@JWT() jwt: IJwt, @Param('id') id: string) {
    return await this.service.findById(jwt.dataSource, id);
  }

  @Delete(':id')
  async deleteProcess(@JWT() jwt: IJwt, @Param('id') id: string) {
    this.logger.log(`DELETE /${id} called to delete process.`);
    const result = await this.service.deleteDeployedProcess(jwt.dataSource, id);
    this.logger.log(`Deleted process result: ${JSON.stringify(result)}`);
    return result;
  }
}
