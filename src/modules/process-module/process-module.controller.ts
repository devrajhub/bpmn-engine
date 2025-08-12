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
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CreateProcessModuleDto } from './dto/create-process-module.dto';
import { GetAllProcessModuleDTO } from './dto/get-all-process-module.dto';
import { UpdateProcessModuleDto } from './dto/update-process-module.dto';
import { ProcessModuleService } from './process-module.service';

@ApiBearerAuth()
@ApiTags('Process Module')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/process-modules',
})
export class ProcessModuleController {
  private readonly logger = new Logger(ProcessModuleController.name);
  constructor(private readonly processModuleService: ProcessModuleService) {}

  @Post()
  async create(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Body() createProcessModuleDto: CreateProcessModuleDto,
  ) {
    const payload = {
      ...createProcessModuleDto,
      created_by: jwt.sub,
    };
    return this.processModuleService.create(
      tenant_id,
      payload,
      jwt,
      jwt.dataSource,
    );
  }

  @Post(':id/deploy')
  async deploy(
    @Param('tenant_id') tenant_id: number,
    @Param('id') process_module_id: string,
    @JWT() jwt: IJwt,
  ) {
    return this.processModuleService.deploy(
      tenant_id,
      process_module_id,
      jwt,
      jwt.dataSource,
    );
  }

  @Get()
  async findAll(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Query() query: GetAllProcessModuleDTO,
  ) {
    const result = await this.processModuleService.findAll(
      tenant_id,
      jwt,
      query,
      jwt.dataSource,
    );
    return SuccessResponseDto.getResponseObject(
      result,
      'Success in fetching process modules',
      null,
      query?.pageOff,
    );
  }

  @Get('subprocess') async getSubprocesses(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Query() query: PaginationDTO,
  ) {
    const result = await this.processModuleService.getSubprocesses(
      tenant_id,
      jwt,
      query,
      jwt.dataSource,
    );
    return SuccessResponseDto.getResponseObject(
      result,
      'Success in fetching process modules',
      null,
      query?.pageOff,
    );
  }

  @Get(':id')
  async findOne(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
    @Param('id') id: string,
  ) {
    return this.processModuleService.findOne(jwt.dataSource, tenant_id, id);
  }

  @Patch(':id')
  async update(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenant_id: number,
    @Param('id') id: string,
    @Body() updateProcessModuleDto: UpdateProcessModuleDto,
  ) {
    return this.processModuleService.update(
      jwt.dataSource,
      tenant_id,
      id,
      updateProcessModuleDto,
    );
  }

  @Delete(':id')
  async remove(
    @JWT() jwt: IJwt,
    @Param('id') id: string,
    @Param('tenant_id') tenant_id: number,
  ) {
    this.logger.log(`DELETE /${id} called to delete process.`);
    const result = this.processModuleService.remove(
      jwt.dataSource,
      id,
      tenant_id,
    );
    this.logger.log(`Deleted process result: ${JSON.stringify(result)}`);
    return result;
  }
}
