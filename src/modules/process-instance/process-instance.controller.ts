// src/process-instance/process-instance.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/commons/decorators';
import { Domain } from 'src/commons/decorators/domain.decorator';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { BulkFetchInstancesDto } from './dto/bulk-fetch-instances.dto';
import { BulkUpdateInstancesDto } from './dto/bulk-update-instances.dto';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { GetAllInstancesDTO } from './dto/get-process-instances.dto';
import { ProcessInstanceService } from './process-instance.service';

@ApiBearerAuth()
@ApiTags('Process Instance')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/process-instances',
})
export class ProcessInstanceController {
  private readonly logger = new Logger(ProcessInstanceController.name);

  constructor(private readonly instanceService: ProcessInstanceService) {}

  @Get('count-stage-steps')
  async countStageSteps(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
  ) {
    const result = await this.instanceService.countStageSteps(tenant_id, jwt);
    return result;
  }

  @Post('bulk-fetch')
  async BulkFetch(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Body() dto: BulkFetchInstancesDto,
  ) {
    this.logger.log(
      `POST /bulk-fetch called with body: ${JSON.stringify(dto)}`,
    );
    const result = await this.instanceService.bulkFetch(tenant_id, jwt, dto);
    this.logger.log(`Bulk Fetch with result: ${JSON.stringify(result)}`);
    return result;
  }

  @Post('start')
  async startInstance(
    @Param('tenant_id') tenant_id: number,
    @Body() dto: CreateProcessInstanceDto,
    @JWT() jwt: IJwt,
  ) {
    this.logger.log(`POST /start called with body: ${JSON.stringify(dto)}`);
    const result = await this.instanceService.startInstance(
      dto,
      tenant_id,
      jwt.sub,
      jwt,
    );
    this.logger.log(`Process started with result: ${JSON.stringify(result)}`);
    return result;
  }

  @Get()
  async getAllInstances(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Query() query: GetAllInstancesDTO,
  ) {
    this.logger.log(`GET / called to fetch all process instances`);
    const result = await this.instanceService.getAllInstances(
      tenant_id,
      jwt,
      query,
    );
    this.logger.log(`Fetched ${JSON.stringify(result)} process instances`);
    return SuccessResponseDto.getResponseObject(
      result,
      'Success in fetching process instances',
      null,
      query?.pageOff,
    );
  }

  @Get(':id')
  async getInstanceById(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
    @Param('id') id: string,
  ) {
    this.logger.log(`GET /${id} called to fetch process instance`);
    const result = await this.instanceService.getInstanceById(
      jwt.dataSource,
      tenant_id,
      id,
    );
    this.logger.log(`Fetched instance: ${JSON.stringify(result)}`);
    return result;
  }

  @Patch('bulk-update')
  async bulkUpdate(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
    @Body() dto: BulkUpdateInstancesDto,
  ) {
    this.logger.log(
      `Patch /bulk-update called with body: ${JSON.stringify(dto)}`,
    );
    const result = await this.instanceService.bulkUpdate(tenant_id, jwt, dto);
    this.logger.log(
      `Bulk update completed with result: ${JSON.stringify(result)}`,
    );
    return result;
  }

  @Patch(':id')
  async updateInstance(
    @JWT() jwt: IJwt,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    this.logger.log(
      `Received update for process instance ID: ${id} with data: ${JSON.stringify(dto)}`,
    );
    return this.instanceService.updateInstance(jwt, id, dto);
  }

  @Public()
  @Patch(':id/assign-task')
  async updateInstancePublic(
    @Param('tenant_id') tenant_id: number,
    @Domain() domain: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    this.logger.log(
      `Received update for process instance ID: ${id} with data: ${JSON.stringify(dto)}`,
    );
    return this.instanceService.updateInstancePublic(
      id,
      tenant_id,
      domain,
      dto,
    );
  }

  @Delete(':id')
  async deleteInstance(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
    @Param('id') id: string,
  ) {
    this.logger.log(`DELETE /${id} called to delete process instance`);
    const result = await this.instanceService.deleteInstance(
      jwt.dataSource,
      tenant_id,
      id,
    );
    this.logger.log(`Deleted instance result: ${JSON.stringify(result)}`);
    return result;
  }
}
