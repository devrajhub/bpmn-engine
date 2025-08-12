import { Injectable, Logger } from '@nestjs/common';
import { PaginationDTO } from 'src/commons/dtos/pagination.dto';
import { ModelType, UserPermissionEnum } from 'src/commons/enums/common-enum';
import { IJwt } from 'src/commons/interface/jwt.interface';
import {
  createOne,
  findByCondition,
  findByQuery,
  findOneByConditionId,
  softDeleteOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { DataSource } from 'typeorm';
import { DmnService } from '../dmn/dmn.service';
import { ProcessDefinitionService } from '../process-definition/process-definition.service';
import { CreateProcessModuleDto } from './dto/create-process-module.dto';
import { GetAllProcessModuleDTO } from './dto/get-all-process-module.dto';
import { UpdateProcessModuleDto } from './dto/update-process-module.dto';
import { ProcessModule } from './entities/process-module.entity';

@Injectable()
export class ProcessModuleService {
  private readonly logger = new Logger(ProcessModuleService.name);
  constructor(
    private readonly processDefinitionService: ProcessDefinitionService,
    private readonly dmnService: DmnService,
  ) {}

  async create(
    tenant_id: number,
    createProcessModuleDto: CreateProcessModuleDto,
    jwt: IJwt,
    dataSource: DataSource,
  ) {
    const repo = dataSource.getRepository(ProcessModule);

    const createDTO = {
      tenant_id: tenant_id,
      created_by: jwt.sub,
      ...createProcessModuleDto,
      last_edited: new Date(),
    };
    const processModule = await createOne(repo, createDTO);
    return processModule;
  }

  async deploy(
    tenant_id: number,
    process_module_id: string,
    jwt: IJwt,
    dataSource: DataSource,
  ) {
    const repo = dataSource.getRepository(ProcessModule);
    const processModule = await findByCondition(repo, {
      id: process_module_id,
      tenant_id: tenant_id,
    });
    if (!processModule.length) {
      this.logger.warn(`Process Module not found for ID: ${process_module_id}`);
      throw new Error('Process Module not found');
    }
    if (processModule[0].model_type == ModelType.BPMN) {
      console.log(`Deploying process module with id:${process_module_id}`);
      const processDefinitionDto = {
        name: processModule[0].name,
        bpmn_xml: processModule[0].xml,
        key: processModule[0].key,
        description: processModule[0].description,
        tenant_id: tenant_id,
        deployed_by: jwt.sub,
      };
      const deployedProcessModule = await this.processDefinitionService.deploy(
        dataSource,
        tenant_id,
        processDefinitionDto,
      );
      if (!deployedProcessModule) {
        this.logger.warn(
          `Failed to deploy process module with id:${process_module_id}`,
        );
        throw new Error('Failed to deploy process module');
      }
    }
    if (processModule[0].model_type == ModelType.DMN) {
      console.log(`Deploying process module with id:${process_module_id}`);
      const DmnDto = {
        name: processModule[0]?.name,
        dmn_xml: processModule[0]?.xml,
        key: processModule[0]?.key,
        description: processModule[0]?.description,
        tenant_id: tenant_id,
        deployed_by: jwt.sub,
      };
      const deployedProcessModule = await this.dmnService.deploy(
        dataSource,
        tenant_id,
        DmnDto,
      );
      if (!deployedProcessModule) {
        this.logger.warn(
          `Failed to deploy process module with id:${process_module_id}`,
        );
        throw new Error('Failed to deploy process module');
      }
    }
    const updatedProcessModule = await updateOne(repo, process_module_id, {
      is_published: true,
      last_edited: new Date(),
    });
    return updatedProcessModule;
  }

  async findAll(
    tenant_id: number,
    jwt: IJwt,
    params: GetAllProcessModuleDTO,
    dataSource: DataSource,
  ) {
    const {
      page,
      limit,
      keyword,
      sort,
      order,
      pageOff,
      is_published,
      is_subprocess,
      model_type,
    } = params;
    const repo = dataSource.getRepository(ProcessModule);
    const searchColumns = ['name', 'key'];
    const sortingColumns = sort ? [sort] : ['updated_at'];
    const orderValue = order === 'ASC' ? 1 : -1;
    const query: {
      is_active: boolean;
      is_deleted: boolean;
      tenant_id: number;
      created_by: string;
      is_published?: boolean;
      model_type: ModelType;
      is_subprocess?: boolean;
    } = {
      is_active: true,
      is_deleted: false,
      tenant_id: tenant_id,
      created_by: jwt.sub,
      model_type: model_type,
    };
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_BOARD_ADMIN)) {
      delete query.created_by;
    }
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_SUPER_ADMIN)) {
      delete query.tenant_id;
      delete query.created_by;
    }

    if (typeof is_subprocess === 'boolean') {
      query.is_subprocess = is_subprocess;
    }
    if (typeof is_published === 'boolean') {
      query.is_published = is_published;
    }

    const options = {
      page,
      limit,
      searchQuery: keyword,
      searchColumns,
      undefined,
      sortingColumns,
      order: orderValue,
      pageOff,
    };
    const processModules = await findByQuery(repo, query, options);
    return processModules;
  }

  // get ki api with all is-subprocess true and is-active true, tenant_id -> name, id , created-at
  // pagination add
  // endpoint -> subprocess

  async getSubprocesses(
    tenant_id: number,
    jwt: IJwt,
    params: PaginationDTO,
    dataSource: DataSource,
  ) {
    const { page, limit, keyword, sort, order, pageOff } = params;
    const repo = dataSource.getRepository(ProcessModule);
    const searchColumns = [];
    const sortingColumns = sort ? [sort] : undefined;
    const orderValue = order === 'ASC' ? 1 : -1;

    const query = {
      is_active: true,
      is_deleted: false,
      is_subprocess: true,
      tenant_id: tenant_id,
      created_by: jwt.sub,
    };

    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_BOARD_ADMIN)) {
      delete query.created_by;
    }
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_SUPER_ADMIN)) {
      delete query.tenant_id;
      delete query.created_by;
    }
    const options = {
      page,
      limit,
      keyword,
      searchColumns,
      undefined,
      sortingColumns,
      orderValue,
      pageOff,
    };
    const subprocesses = await findByQuery(repo, query, options);
    return subprocesses;
  }

  async findOne(dataSource: DataSource, tenant_id: number, id: string) {
    this.logger.log(`Fetching process module by ID: ${id}`);
    const repo = dataSource.getRepository(ProcessModule);
    const processModule = await findByCondition(repo, {
      id: id,
      tenant_id: tenant_id,
    });

    if (!processModule) {
      this.logger.warn(`Process Module not found for ID: ${id}`);
      throw new Error('Process Module not found');
    }
    this.logger.log(`Process Module found: ${JSON.stringify(processModule)}`);
    this.logger.log(`Fetched Process Module: ${JSON.stringify(processModule)}`);
    return processModule;
  }

  async update(
    dataSource: DataSource,
    tenant_id: number,
    id: string,
    updateProcessModuleDto: UpdateProcessModuleDto,
  ) {
    const repo = dataSource.getRepository(ProcessModule);
    const processModule = await findByCondition(repo, {
      id: id,
      tenant_id: tenant_id,
    });
    if (!processModule) {
      this.logger.warn(`Process Module not found for ID: ${id}`);
      throw new Error('Process Module not found');
    }
    const updateDTO = {
      ...updateProcessModuleDto,
      last_edited: new Date(),
    };

    const updatedProcessModule = await updateOne(repo, id, updateDTO);
    if (!updatedProcessModule) {
      this.logger.warn(`Process Module not updated for ID: ${id}`);
      throw new Error('Process Module not updated');
    }
    return updatedProcessModule;
  }

  async remove(dataSource: DataSource, id: string, tenant_id: number) {
    const repo = dataSource.getRepository(ProcessModule);
    const processModule = await findOneByConditionId(repo, id, {
      tenant_id,
    });

    if (!processModule) {
      this.logger.warn(`Process Module not found for ID: ${id}`);
      throw new Error('Process Module not found');
    }

    try {
      await softDeleteOneByQuery(repo, { id });
    } catch (error) {
      console.error('Error while removing process module', error);
    }
  }
}
