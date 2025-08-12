import { Injectable, Logger } from '@nestjs/common';
import {
  createOne,
  findByCondition,
  findByQuery,
} from 'src/commons/repository/common.repository';
import { DataSource } from 'typeorm';
import { CreateProInstVariableDto } from './dto/create-pro-inst-variable.dto';
import { ProInstVariable } from './entities/pro-inst-variable.entity';

@Injectable()
export class ProInstVariablesService {
  private readonly logger = new Logger(ProInstVariablesService.name);
  constructor() {}
  async create(
    dataSource: DataSource,
    dto: CreateProInstVariableDto,
  ): Promise<ProInstVariable> {
    const repo = dataSource.getRepository(ProInstVariable);

    const variable: Partial<ProInstVariable> = {
      key: dto.key,
      value: JSON.stringify(dto.value),
      type: dto.type || typeof dto.value,
      process_instance: dto.process_instance,
      task_id: dto.task_id || null,
      task_def_id: dto.task_def_id || null,
      parent_process_instance_id: dto.parent_process_instance_id ?? null,
      root_instance_id: dto.root_instance_id,
    };

    const saved = await createOne(repo, variable);
    this.logger.log(
      `Created variable: ${dto.key} = ${JSON.stringify(dto.value)}`,
    );
    return saved;
  }

  async findAll(dataSource: DataSource, params: any) {
    const repo = dataSource.getRepository(ProInstVariable);
    const { instance_id, key, current_process_instance_id, root_instance_id } =
      params;
    console.log('Fetching all variables for process instance ID:', params);
    const query: {
      is_active: boolean;
      is_deleted: boolean;
      parent_process_instance_id?: string;
      current_process_instance_id?: string;
      root_instance_id?: string;
      key: string;
    } = {
      is_active: true,
      is_deleted: false,
      key: key,
    };
    if (instance_id) {
      query.parent_process_instance_id = instance_id;
    }
    if (root_instance_id) {
      query.root_instance_id = instance_id;
    }
    if (current_process_instance_id) {
      query.current_process_instance_id = current_process_instance_id;
    }

    console.log(
      'Fetching variables for parent process instance ID:',
      query.parent_process_instance_id,
    );

    const variables = await findByQuery(repo, query);
    return variables;
  }

  async findOneByProcessInstanceId(
    dataSource: DataSource,
    processInstanceId: string,
  ) {
    const repo = dataSource.getRepository(ProInstVariable);
    const variable = await findByCondition(repo, {
      current_process_instance_id: processInstanceId,
    });
    return variable;
  }

  remove(id: number) {
    return `This action removes a #${id} proInstVariable`;
  }
}
