// src/process-definition/process-definition.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserPermissionEnum } from 'src/commons/enums/common-enum';
import { IJwt } from 'src/commons/interface/jwt.interface';
import {
  createOne,
  findByQuery,
  findOneByConditionId,
  findOneById,
  findOneByQueryCondition,
  softDeleteOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { DataSource, LessThan } from 'typeorm';
import { BpmnParser } from '../engine/parser/bpmn.parser';
import { CreateProcessDefinitionDto } from './dto/create-process-definition.dto';
import { GetAllProcessDefDTO } from './dto/get-process-definition.dto';
import { RollbackProcessDefinitionDto } from './dto/rollback-process-definition.dto';
import { ProcessDefinition } from './entities/process-definition.entity';

@Injectable()
export class ProcessDefinitionService {
  private readonly logger = new Logger(ProcessDefinitionService.name);

  constructor(private readonly parser: BpmnParser) {}

  async deploy(
    dataSource: DataSource,
    tenant_id: number,
    dto: CreateProcessDefinitionDto,
  ) {
    this.logger.log(
      `Deploy called by user=${dto.deployed_by}, tenant=${tenant_id}`,
    );

    try {
      const repo = dataSource.getRepository(ProcessDefinition);

      if (!dto.name || !dto.bpmn_xml || !tenant_id) {
        throw new BadRequestException('Missing required fields');
      }

      const parsedXml = await this.parser.parseXml(dto.bpmn_xml);
      const def = this.parser.extractDefinitions(parsedXml);

      const processKey = dto.key;
      if (!processKey) {
        throw new BadRequestException(
          'Invalid BPMN XML: Missing Unique Process Key',
        );
      }

      const latest = await this.findLatestVersion(
        dataSource,
        processKey,
        tenant_id,
      );
      const nextVersion = latest ? latest.version + 1 : 1;
      const sortingColumns = ['version'];
      const order = -1;
      const previousVersion = await findOneByQueryCondition(
        repo,
        {
          tenant_id: tenant_id,
          key: processKey,
        },
        undefined,
        undefined,
        sortingColumns,
        order,
        [],
      );
      if (previousVersion) {
        await updateOne(repo, previousVersion.id, {
          is_latest: false,
        });
      }
      const deployDTO = {
        name: dto.name,
        key: processKey,
        version: nextVersion,
        bpmn_xml: dto.bpmn_xml,
        tasks: def.tasks,
        sequence_flows: def.sequenceFlows,
        tenant_id: tenant_id,
        description: dto.description,
        deployed_by: dto.deployed_by,
        deployed_at: new Date(),
        is_active: true,
        is_latest: true,
        is_subprocess: dto.is_subprocess || false,
      };

      const saved = await createOne(repo, deployDTO);

      this.logger.log(
        `Process deployed successfully: id=${saved.id}, key=${processKey}, version=${saved.version}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to deploy process: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Process deployment failed');
    }
  }

  async rollback(
    dataSource: DataSource,
    tenant_id: number,
    body: RollbackProcessDefinitionDto,
  ) {
    const repo = dataSource.getRepository(ProcessDefinition);
    const { current_process_definition_id, process_definition_id_to_deploy } =
      body;
    this.logger.log(
      `Rollback called for tenant=${tenant_id}, current_process_definition_id=${current_process_definition_id}, process_definition_id_to_deploy=${process_definition_id_to_deploy}`,
    );

    try {
      const currentProcessDef = await findOneByConditionId(
        repo,
        current_process_definition_id,
        { tenant_id: tenant_id },
      );
      if (!currentProcessDef) {
        throw new BadRequestException('Current process definition not found');
      }

      const rollbackProcessDef = await findOneByConditionId(
        repo,
        process_definition_id_to_deploy,
        { tenant_id: tenant_id },
      );
      if (!rollbackProcessDef) {
        throw new BadRequestException('Rollback process definition not found');
      }

      const deployDTO = {
        name: currentProcessDef.name,
        key: currentProcessDef.key,
        version: currentProcessDef.version + 1,
        bpmn_xml: rollbackProcessDef.bpmn_xml,
        tasks: rollbackProcessDef.tasks,
        sequence_flows: rollbackProcessDef.sequence_flows,
        tenant_id: tenant_id,
        description: `Rollback to version ${rollbackProcessDef.version}`,
        deployed_at: new Date(),
        is_active: true,
        is_latest: true,
        is_subprocess: rollbackProcessDef.is_subprocess,
      };

      const saved = await this.deploy(dataSource, tenant_id, deployDTO);

      this.logger.log(
        `Process rolled back successfully: id=${saved.id}, key=${saved.key}, version=${saved.version}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to rollback process: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Process rollback failed');
    }
  }

  async findAll(tenant_id: number, params: GetAllProcessDefDTO, jwt: IJwt) {
    const {
      page,
      limit,
      keyword,
      sort,
      order,
      pageOff,
      key,
      is_latest,
      is_subprocess,
    } = params;
    const repo = jwt.dataSource.getRepository(ProcessDefinition);
    const searchColumns = ['name', 'key'];
    const sortingColumns = sort ? [sort] : ['updated_at'];
    const orderValue = order === 'ASC' ? 1 : -1;
    const query: {
      tenant_id: number;
      is_subprocess?: boolean;
      is_active: boolean;
      is_deleted: boolean;
      key?: string;
      is_latest?: boolean;
    } = {
      tenant_id: tenant_id,
      is_active: true,
      is_deleted: false,
    };
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_SUPER_ADMIN)) {
      delete query.tenant_id;
    }
    if (key) {
      query.key = key;
    }
    if (is_latest) {
      query.is_latest = is_latest;
    }
    if (is_subprocess) {
      query.is_subprocess = is_subprocess;
    }
    this.logger.log(`Finding all process definitions for tenant: ${tenant_id}`);
    try {
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
      const result = await findByQuery(repo, query, options);
      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching all definitions: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch process definitions',
      );
    }
  }

  async findById(dataSource: DataSource, id: string) {
    this.logger.log(`Fetching process definition by id: ${id}`);
    try {
      const repo = dataSource.getRepository(ProcessDefinition);
      const query = {};
      return await findOneByConditionId(repo, id, query);
    } catch (error) {
      this.logger.error(
        `Error fetching process definition: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch process definition',
      );
    }
  }

  async findLatestVersion(
    dataSource: DataSource,
    key: string,
    tenant_id: number,
  ) {
    this.logger.log(
      `Finding latest version for key=${key}, tenant=${tenant_id}`,
    );
    try {
      const repo = dataSource.getRepository(ProcessDefinition);
      return await findOneByQueryCondition(
        repo,
        { key, tenant_id: tenant_id }, // replace with actual column names
        undefined,
        undefined,
        ['version'],
        -1,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching latest version: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch latest version');
    }
  }

  async deleteDeployedProcess(dataSource: DataSource, id: string) {
    this.logger.log(`Deleting process with ID: ${id}`);
    const repo = dataSource.getRepository(ProcessDefinition);
    const process = await findOneById(repo, id);

    if (!process) {
      this.logger.warn(`Process not found for ID: ${id}`);
      return { message: 'Process not found' };
    }

    await updateOne(repo, id, { is_latest: false });

    const previousVersion = await findOneByQueryCondition(
      repo,
      {
        tenant_id: process.tenant_id,
        key: process.key,
        version: LessThan(process.version),
      },
      undefined,
      undefined,
      ['version'],
      -1,
    );

    if (previousVersion) {
      await updateOne(repo, previousVersion.id, {
        is_latest: true,
      });
    }

    await softDeleteOneByQuery(repo, { id });
    this.logger.log(`Deleted process with ID: ${id}`);

    return { message: 'Process deleted successfully' };
  }
}
