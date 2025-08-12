import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ProcessStatus,
  TaskStatus,
  UserPermissionEnum,
} from 'src/commons/enums/common-enum';
import { IJwt } from 'src/commons/interface/jwt.interface';
import {
  createOne,
  findByIds,
  findByQuery,
  findOneByConditionId,
  findOneById,
  softDeleteOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { CommonMethods } from 'src/commons/utils/common-methods';
import { convertTokenFormat } from 'src/commons/utils/token-position-formatter';
import { getOrCreateSchemeConnection } from 'src/config/domain-scheme-connection';
import { DataSource } from 'typeorm';
import { EngineService } from '../engine/engine.service';
import { ProInstVariable } from '../pro-inst-variables/entities/pro-inst-variable.entity';
import { ProInstVariablesService } from '../pro-inst-variables/pro-inst-variables.service';
import { ProcessDefinition } from '../process-definition/entities/process-definition.entity';
import { ProcessDefinitionService } from '../process-definition/process-definition.service';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { TaskService } from '../task/task.service';
import { TenantService } from '../tenants/tenants.service';
import { BulkFetchInstancesDto } from './dto/bulk-fetch-instances.dto';
import { BulkUpdateInstancesDto } from './dto/bulk-update-instances.dto';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { GetAllInstancesDTO } from './dto/get-process-instances.dto';
import { ProcessInstance } from './entities/process-instance.entity';

@Injectable()
export class ProcessInstanceService {
  private readonly logger = new Logger(ProcessInstanceService.name);
  private readonly className = ProcessInstanceService.name;
  constructor(
    private readonly variableService: ProInstVariablesService,
    private readonly tenantService: TenantService,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
    @Inject(forwardRef(() => EngineService))
    private readonly engineService: EngineService,
    private readonly processDefinitionService: ProcessDefinitionService,
    private readonly programOrchestrationService: ProgramOrchestrationService,
  ) {}

  async bulkFetch(tenant_id: number, jwt: IJwt, dto: BulkFetchInstancesDto) {
    const { dataSource } = jwt;
    this.logger.log(
      `Bulk fetching process instances for IDs: ${JSON.stringify(dto.instance_ids)}`,
    );

    const repo = dataSource.getRepository(ProcessInstance);
    const includeVariables = dto?.relations?.includes('variables');

    const instances = await findByIds(
      repo,
      dto.instance_ids,
      includeVariables ? ['variables'] : [],
      dto?.projectionColumns,
    );

    const instanceMap = new Map(instances.map((i) => [i.id, i]));

    const results = await Promise.all(
      dto.instance_ids.map(async (instanceId) => {
        try {
          const instance = instanceMap.get(instanceId);

          if (!instance) {
            return {
              instance_id: instanceId,
              error: 'Instance not found',
            };
          }

          const currentActivity = instance.token_positions.find(
            (token) => token.activity_id === instance.current_activity_id,
          );

          if (!currentActivity) {
            return {
              instance_id: instanceId,
              error: 'Current activity not found',
            };
          }

          const stage = {
            current_activity_id: instance.current_activity_id,
            current_activity_name: instance.current_activity_name,
            current_activity_type: instance.current_activity_type,
            current_activity_key: instance.current_activity_key,
          };

          let step = { ...stage };

          instance.token_positions = convertTokenFormat(
            instance.token_positions || [],
          );

          let task = [];
          if (dto?.relations?.includes('task')) {
            const taskRes = await this.taskService.getAllTasks(
              dataSource,
              tenant_id,
              jwt,
              {
                parent_process_instance_id: instanceId,
                status: TaskStatus.PENDING,
              },
            );
            task = taskRes?.data ?? [];
          }

          if (
            instance.current_activity_type === 'bpmn:subProcess' &&
            instance.subprocess_id
          ) {
            const subprocessInstance = await findOneByConditionId(
              repo,
              instance.subprocess_id,
              undefined,
              ['variables'],
            );

            if (subprocessInstance) {
              step = {
                current_activity_id: subprocessInstance.current_activity_id,
                current_activity_name: subprocessInstance.current_activity_name,
                current_activity_type: subprocessInstance.current_activity_type,
                current_activity_key: subprocessInstance.current_activity_key,
              };
            }
          }

          const nextUserTask = this.findNextUserTask(
            instance.current_activity_id,
            instance.flow_elements,
          );

          const nextUserTaskObject = {
            activity_id: nextUserTask?.$?.id || null,
            activity_name: nextUserTask?.$?.name || null,
            activity_type: nextUserTask?.type || null,
            activity_key:
              nextUserTask?.['bpmn:extensionElements']?.[
                'stagename:stageNameDefinition'
              ]?.$?.stagename || null,
          };
          const instanceWithoutFlow = { ...instance };
          delete instanceWithoutFlow.flow_elements;
          return {
            ...instanceWithoutFlow,
            stage,
            step,
            next_user_task: nextUserTaskObject,
            task,
            token_positions: (instance?.token_positions || []).filter(
              (token) =>
                token.type === 'bpmn:userTask' ||
                token.type === 'bpmn:subProcess',
            ),
          };
        } catch (error) {
          this.logger.error(
            `Error processing instance ${instanceId}: ${error.message}`,
          );
          return {
            instance_id: instanceId,
            error: error.message,
          };
        }
      }),
    );

    return results.length === 1 ? results[0] : results;
  }

  async startInstance(
    dto: CreateProcessInstanceDto,
    tenant_id: number,
    created_by: string,
    jwt: IJwt,
    root_instance_id?: string,
    parent_instance_id?: string,
  ) {
    const { dataSource } = jwt;
    this.logger.log(
      `Starting new process instance with DTO: ${JSON.stringify(dto)}`,
    );
    const repo = dataSource.getRepository(ProcessInstance);
    const processDefintionRepo = dataSource.getRepository(ProcessDefinition);

    // Fetch process definition first (needed for token positions)
    this.logger.log(
      `Fetching process definition with key: ${dto.process_definition_key}`,
    );
    // Uncomment the following line if you want to fetch by ID instead of key
    // const processDefinition = await this.processDefinitionService.findById(
    //   dataSource,
    //   dto.process_definition_id,
    // );
    const query = {
      is_active: true,
      is_deleted: false,
      key: dto.process_definition_key,
      is_latest: true,
    };
    const processDefinition = await findByQuery(processDefintionRepo, query);
    const processDefinitionData = processDefinition?.data[0];
    if (!processDefinitionData) {
      this.logger.error(
        `Process Definition not found for key: ${dto.process_definition_key}`,
      );
      throw new Error('Process Definition not found');
    }

    // Prepare flow_elements
    const flow_elements = this.getFlowElements(processDefinitionData);

    // Token positions initialization
    const now = new Date().toISOString(); // current ISO timestamp
    const token_positions: {
      activity_id: string;
      activity_name?: string;
      activity_key?: string;
      status: 'pending' | 'completed';
      type: string;
      created_at: string;
      updated_at?: string;
    }[] = flow_elements
      .filter((el) => el.type !== 'sequenceFlow')
      .map((el) => {
        const isStart = el.type === 'bpmn:startEvent';
        return {
          activity_id: el.$.id,
          activity_name: el?.$?.name,
          activity_key:
            el?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']?.$
              ?.stagename ?? null,
          status: isStart ? 'completed' : 'pending',
          type: el.type,
          outgoing: el?.$['bpmn:outgoing'],
          incoming: el?.$['bpmn:incoming'],
          created_at: now,
          updated_at: isStart ? now : undefined,
        };
      });
    const instance = new ProcessInstance();
    instance.process_definition_id = processDefinitionData?.id;
    instance.created_by = created_by;
    instance.status = ProcessStatus.RUNNING;
    instance.start_time = new Date();
    instance.token_positions = token_positions;
    instance.flow_elements = flow_elements;
    instance.tenant_id = tenant_id;
    instance.current_activity_id = flow_elements[0].$.id;
    instance.current_activity_type = flow_elements[0].type;
    instance.current_activity_name = flow_elements[0].$.name;
    instance.current_task_assignee = [
      {
        id: created_by,
        is_used: false,
        updated_at: new Date(),
      },
    ];
    instance.current_activity_key =
      flow_elements[0]?.['bpmn:extensionElements']?.[
        'stagename:stageNameDefinition'
      ]?.$?.stagename ?? null;
    if (root_instance_id) {
      instance.root_instance_id = root_instance_id;
    }
    if (parent_instance_id) {
      instance.parent_instance_id = parent_instance_id;
    }

    // Handle variables
    const context: Record<string, any> = {};
    if (dto?.variables) {
      const rootId = dto.variables.root_instance_id ?? null;
      const parentId = dto.variables.parent_instance_id ?? null;
      const variableEntities: ProInstVariable[] = Object.entries(
        dto.variables,
      ).map(([key, value]) => {
        const variable = new ProInstVariable();
        variable.key = key;
        variable.value = value;
        variable.type = typeof value;
        variable.root_instance_id = rootId;
        variable.parent_process_instance_id = parentId;
        return variable;
      });
      instance.variables = variableEntities;

      for (const [key, value] of Object.entries(dto.variables)) {
        context[key] = value;
      }
    }
    const savedInstance = await repo.save(instance);
    if (instance.variables) {
      for (const variable of instance.variables) {
        if (!variable.root_instance_id) {
          variable.root_instance_id = savedInstance.id;
        }
        if (!variable.parent_process_instance_id) {
          variable.parent_process_instance_id = savedInstance.id;
        }
      }
    }

    const variableRepo = dataSource.getRepository(ProInstVariable);

    const allVariables = [
      ...(instance.variables || []),
      variableRepo.create({
        key: 'processInstanceId',
        value: savedInstance.id,
        type: 'string',
        process_instance: savedInstance,
        parent_process_instance_id: savedInstance.id,
        current_process_instance_id: savedInstance.id,
      }),
      variableRepo.create({
        key: 'tenant_id',
        value: String(savedInstance.tenant_id),
        type: 'string',
        process_instance: savedInstance,
        parent_process_instance_id: savedInstance.id,
        current_process_instance_id: savedInstance.id,
      }),
    ];

    await variableRepo.save(allVariables);

    this.logger.log(`Process instance saved with ID: ${savedInstance.id}`);

    const processDefForEngine = {
      instance_id: savedInstance.id,
      tenant_id: savedInstance.tenant_id,
      ...processDefinitionData,
      context,
      flow_elements,
    };

    this.logger.log(
      `Starting process in engine with instance ID: ${savedInstance.id}`,
    );
    const updatePayload: any = {
      context,
    };

    if (!root_instance_id) {
      updatePayload.root_instance_id = savedInstance.id;
    }
    if (!parent_instance_id) {
      updatePayload.parent_instance_id = savedInstance.id;
    }

    if (updatePayload.root_instance_id || updatePayload.parent_instance_id) {
      await this.updateInstance(jwt, savedInstance.id, updatePayload);
    }

    await this.engineService.startProcess(jwt, processDefForEngine);

    const result = {
      message: 'Process instance started',
      instance_id: savedInstance.id,
      status: savedInstance.status,
    };
    this.logger.log(`Process started successfully: ${JSON.stringify(result)}`);
    return result;
  }

  async getAllInstances(
    tenant_id: number,
    jwt: IJwt,
    params: GetAllInstancesDTO,
  ) {
    //paramter - status, tenant id
    const {
      page,
      limit,
      keyword,
      sort,
      order,
      pageOff,
      status,
      process_definition_id,
    } = params;
    const query: {
      is_active: boolean;
      is_deleted: boolean;
      status?: ProcessStatus;
      process_definition_id?: string;
      tenant_id?: number;
      created_by?: string;
    } = {
      is_active: true,
      is_deleted: false,
      tenant_id: tenant_id,
      created_by: jwt.sub,
    };
    const repo = jwt.dataSource.getRepository(ProcessInstance);

    if (status) {
      query.status = status;
    }
    if (process_definition_id) {
      query.process_definition_id = process_definition_id;
    }
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_BOARD_ADMIN)) {
      delete query.created_by;
    }
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_SUPER_ADMIN)) {
      delete query.tenant_id;
      delete query.created_by;
    }
    const searchColumns = [];
    const sortingColumns = sort ? [sort] : undefined;
    const orderValue = order === 'ASC' ? 1 : -1;

    this.logger.log('Fetching all process instances');
    const options = {
      page,
      limit,
      keyword,
      searchColumns,
      undefined,
      sortingColumns,
      orderValue,
      pageOff,
      relations: ['variables'],
    };
    const result = await findByQuery(repo, query, options);
    return result;
  }

  async getInstanceById(dataSource: DataSource, tenant_id: number, id: string) {
    this.logger.log(`Fetching process instance by ID: ${id}`);
    const query = {};
    const repo = dataSource.getRepository(ProcessInstance);
    const instance = await findOneByConditionId(repo, id, query, ['variables']);

    if (!instance) {
      this.logger.warn(`Instance not found for ID: ${id}`);
      throw new Error('Instance not found');
    }
    this.logger.log(`Instance found: ${JSON.stringify(instance)}`);

    const result = {
      ...instance,
    };

    this.logger.log(
      `Fetched instance with variables: ${JSON.stringify(result)}`,
    );
    return result;
  }

  async deleteInstance(dataSource: DataSource, tenant_id: number, id: string) {
    this.logger.log(`Deleting process instance with ID: ${id}`);
    const repo = dataSource.getRepository(ProcessInstance);
    const instance = await findOneByConditionId(repo, id, {
      tenant_id: tenant_id,
    });

    if (!instance) {
      this.logger.warn(`Instance not found for ID: ${id}`);
      return { message: 'Instance not found' };
    }
    await updateOne(repo, id, {
      status: ProcessStatus.CANCELLED,
    });
    await softDeleteOneByQuery(repo, { id });
    this.logger.log(`Deleted instance with ID: ${id}`);

    return { message: 'Instance deleted successfully' };
  }

  async updateInstance(jwt: IJwt, id: string, dto: any) {
    const { dataSource } = jwt;
    this.logger.log(
      `Updating process instance ID: ${id} with DTO: ${JSON.stringify(dto)}`,
    );
    const repo = dataSource.getRepository(ProcessInstance);

    const instance = await findOneById(repo, id);
    if (!instance) {
      this.logger.warn(`Instance not found for update with ID: ${id}`);
      throw new Error('Instance not found');
    }

    // Intelligent token_positions update
    if (dto.token_positions?.length) {
      const incomingToken = dto.token_positions[0];
      const existingTokens = instance.token_positions ?? [];

      const updatedTokens = existingTokens.map((token) => {
        if (token.activity_id === incomingToken.activity_id) {
          return {
            ...token,
            ...incomingToken, // status, updated_at, etc.
            updated_at: new Date().toISOString(), // auto add
          };
        }
        return token;
      });

      // If token not found, add it
      const tokenExists = updatedTokens.some(
        (t) => t.activity_id === incomingToken.activity_id,
      );
      if (!tokenExists) {
        updatedTokens.push({
          ...incomingToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      dto.token_positions = updatedTokens;
    }

    Object.assign(instance, dto);

    const updated = await updateOne(repo, id, instance);

    this.logger.log(
      `Process instance updated successfully: ${JSON.stringify(updated)}`,
    );
    let bulkFetchInstanceId = id;
    if (instance.is_subprocess) {
      bulkFetchInstanceId = instance.parent_instance_id;
    }
    const bulkFetchDto = {
      instance_ids: [bulkFetchInstanceId],
      relations: ['variables', 'task'],
      projectionColumns: [
        'id',
        'process_definition_id',
        'tenant_id',
        'created_by',
        'status',
        'start_time',
        'current_task_assignee',
        'current_activity_id',
        'current_activity_type',
        'current_activity_name',
        'current_activity_key',
        'token_positions',
        'flow_elements',
        'is_subprocess',
        'subprocess_id',
      ],
    };
    const bulkFetch = await this.bulkFetch(
      instance.tenant_id,
      jwt,
      bulkFetchDto,
    );
    const updateWebhookDTO: any = {
      type: 'Application',
      update: {
        process_instance_id: bulkFetch?.id,
        stage: bulkFetch?.stage,
        step: bulkFetch?.step,
        current_task_assignee: bulkFetch?.current_task_assignee,
      },
    };
    if (bulkFetch?.task?.[0]?.form_key) {
      updateWebhookDTO.update.form_key = bulkFetch?.task?.[0]?.form_key;
    }
    this.logger.debug(
      this.className,
      `Updating web hook for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${instance.tenant_id}`,
    );
    let updatedWebHook;
    if (bulkFetch?.step?.current_activity_type == 'bpmn:userTask') {
      updatedWebHook =
        await this.programOrchestrationService.handleWorkflowUpdate(
          updateWebhookDTO,
          instance.tenant_id,
          jwt,
        );
    }
    if (!updatedWebHook) {
      this.logger.debug(
        this.className,
        `Failed to Update web hook for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${instance.tenant_id}`,
      );
    } else {
      this.logger.debug(
        this.className,
        `Updated web hook successfully for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${instance.tenant_id}`,
      );
    }

    return { message: 'Instance updated', updated };
  }
  async updateInstancePublic(
    id: string,
    tenant_id: number,
    domain: string,
    dto: any,
  ) {
    const tenant = await this.tenantService.getTenantsByIds(
      [tenant_id],
      domain,
    );

    if (!tenant) {
      throw new NotFoundException(CommonMethods.getErrorMsg('TNT_1002'));
    }
    const subdomain = tenant.domain_name.split('.')[0];
    const dataSource = await getOrCreateSchemeConnection(
      subdomain,
      tenant.db_secret_manager,
    );
    const instanceRepo = dataSource.getRepository(ProcessInstance);

    const updatedInstance = await updateOne(instanceRepo, id, {
      current_task_assignee: dto?.current_task_assignee,
    });
    return updatedInstance;
  }

  getFlowElements(processDefinition: any): any[] {
    return [
      ...processDefinition.tasks.map((task) => ({
        ...task,
        type: task.type ?? task['$type'] ?? task['type'],
        $: task.$ ?? { id: task.id ?? task['id'] },
      })),
      ...processDefinition.sequence_flows.map((flow) => ({
        ...flow,
        type: 'sequenceFlow',
        $: flow.$ ?? { id: flow.id ?? flow['id'] },
      })),
    ];
  }

  async resolveExpressionFromVariable(
    dataSource: DataSource,
    { expression, instance_id, tenant_id },
  ) {
    this.logger.log(
      `resolveExpressionFromVariable: STARTED: ${JSON.stringify(expression)}`,
    );
    const regex = /\$\{([^}]+)\}/g;
    const keys: string[] = [];
    let match;

    // Extract all keys from the expression
    while ((match = regex.exec(expression)) !== null) {
      keys.push(match[1]);
    }
    const key = keys[0];
    const variableValue = await this.variableService.findAll(dataSource, {
      instance_id,
      tenant_id,
      key,
    });
    console.log('variableValue', variableValue?.data[0]?.value);

    return JSON.parse(variableValue?.data[0]?.value ?? null);
  }

  async startSubprocessInstance(
    jwt: IJwt,
    params: {
      process_definition_id: string;
      parent_instance_id: string;
      root_instance_id: string;
      tenant_id: number;
      subprocess_element_id: string;
      flow_elements: any[];
      context: any;
      current_activity_id: string;
      current_activity_type: string;
      current_activity_name?: string;
      variables?: Record<string, any>;
    },
  ) {
    const { dataSource } = jwt;
    this.logger.log(
      `Starting embedded subprocess instance for parent: ${params.parent_instance_id}`,
    );
    const repo = dataSource.getRepository(ProcessInstance);
    const now = new Date().toISOString();
    const parentInstance = await findOneById(repo, params.parent_instance_id);
    const token_positions: any[] = params.flow_elements
      .filter((el) => el.type !== 'sequenceFlow')
      .map((el) => {
        const isStart = el.type === 'bpmn:startEvent';
        return {
          activity_id: el.$.id,
          status: isStart ? 'completed' : 'pending',
          type: el.type,
          outgoing: el?.$['bpmn:outgoing'],
          incoming: el?.$['bpmn:incoming'],
          created_at: now,
          updated_at: isStart ? now : undefined,
        };
      });

    const instance = new ProcessInstance();
    instance.flow_elements = params.flow_elements;
    console.log(
      'Saving subprocess instance with flow_elements:',
      params.flow_elements,
    );
    instance.process_definition_id = params?.process_definition_id;
    instance.created_by = 'subprocess';
    instance.status = ProcessStatus.RUNNING;
    instance.start_time = new Date();
    instance.context = params?.context;
    instance.token_positions = token_positions;
    instance.tenant_id = params.tenant_id;
    instance.current_task_assignee = parentInstance?.current_task_assignee;
    instance.current_activity_id = params?.current_activity_id;
    instance.current_activity_type = params?.current_activity_type;
    instance.current_activity_name = params?.current_activity_name;
    instance['is_subprocess'] = true;
    instance['parent_instance_id'] = params.parent_instance_id;
    instance['root_instance_id'] = params.root_instance_id;
    instance['subprocess_element_id'] = params.subprocess_element_id;

    const savedInstance = await createOne(repo, instance);
    await updateOne(repo, params.parent_instance_id, {
      subprocess_id: instance.id,
    });
    const variableRepo = dataSource.getRepository(ProInstVariable);
    const processInstanceIdVariable = variableRepo.create({
      key: 'subProcessInstanceId',
      value: savedInstance.id,
      type: 'string',
      process_instance: savedInstance,
      parent_process_instance_id: savedInstance?.parent_instance_id,
      root_instance_id: savedInstance?.root_instance_id,
      current_process_instance_id: savedInstance.id,
    });
    const tenantIdVariable = variableRepo.create({
      key: 'subprocess_tenant_id',
      value: String(savedInstance?.tenant_id),
      type: 'string',
      process_instance: savedInstance,
      parent_process_instance_id: savedInstance?.parent_instance_id,
      root_instance_id: savedInstance?.root_instance_id,
      current_process_instance_id: savedInstance.id,
    });
    await variableRepo.save([processInstanceIdVariable, tenantIdVariable]);
    this.logger.log(
      `Embedded subprocess instance saved with ID: ${savedInstance.id}`,
    );

    if (params.variables) {
      for (const [key, value] of Object.entries(params.variables)) {
        await this.variableService.create(dataSource, {
          key: key,
          value,
          type: typeof value,
          process_instance: savedInstance,
          parent_process_instance_id: savedInstance.parent_instance_id,
          root_instance_id: savedInstance.root_instance_id,
        });
      }
    }

    return savedInstance;
  }

  private getOutgoingIds(element: any): string[] {
    const outgoings = element.$['bpmn:outgoing'];
    return Array.isArray(outgoings) ? outgoings : [outgoings].filter(Boolean);
  }

  private getNextElementId(element: any): string | null {
    const nextOutgoings = element.$['bpmn:outgoing'];
    return Array.isArray(nextOutgoings) ? nextOutgoings[0] : nextOutgoings;
  }

  private shouldStopTraversal(elementType: string): boolean {
    return (
      elementType === 'bpmn:userTask' || elementType === 'bpmn:exclusiveGateway'
    );
  }

  private handleSubprocessTraversal(element: any): string | null {
    return this.getNextElementId(element);
  }

  private handleSequenceFlowTraversal(element: any): string | null {
    return element.$.targetRef;
  }

  findNextUserTask(currentActivityId: string, flowElements: any[]): any {
    const allElements = [...flowElements];
    const currentElement = allElements.find(
      (el) => el.$.id === currentActivityId,
    );

    if (!currentElement || currentElement.type === 'bpmn:exclusiveGateway') {
      return null;
    }

    const outgoingIds = this.getOutgoingIds(currentElement);
    if (outgoingIds.length !== 1) {
      return null;
    }

    let nextId = outgoingIds[0];

    while (nextId) {
      const nextElement = allElements.find((el) => el.$.id === nextId);

      if (!nextElement) {
        return null;
      }

      if (this.shouldStopTraversal(nextElement.type)) {
        return nextElement.type === 'bpmn:userTask' ? nextElement : null;
      }

      if (nextElement.type === 'sequenceFlow') {
        nextId = this.handleSequenceFlowTraversal(nextElement);
        continue;
      }

      if (nextElement.type === 'bpmn:subProcess') {
        nextId = this.handleSubprocessTraversal(nextElement);
        continue;
      }

      nextId = this.getNextElementId(nextElement);
    }

    return null;
  }

  async bulkUpdate(tenant_id: number, jwt: IJwt, dto: BulkUpdateInstancesDto) {
    const { dataSource } = jwt;
    this.logger.log(
      `Bulk updating process instances: ${JSON.stringify(dto)} for tenant_id: ${tenant_id}`,
    );
    const repo = dataSource.getRepository(ProcessInstance);
    const results = [];

    for (const item of dto.instances) {
      try {
        const instance = await findOneByConditionId(
          repo,
          item.process_instance_id,
          {
            tenant_id,
          },
        );

        if (!instance) {
          results.push({
            process_instance_id: item.process_instance_id,
            success: false,
            error: 'Instance not found',
          });
          continue;
        }

        const updated = await updateOne(
          repo,
          item.process_instance_id,
          item.data,
        );

        results.push({
          process_instance_id: item.process_instance_id,
          success: true,
          data: updated,
        });
      } catch (error) {
        this.logger.error(
          `Error updating instance ${item.process_instance_id}: ${error.message}`,
        );
        results.push({
          process_instance_id: item.process_instance_id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      message: 'Bulk update completed',
      results,
    };
  }

  async countStageSteps(tenant_id: number, jwt: IJwt) {
    const { dataSource } = jwt;
    const repo = dataSource.getRepository(ProcessInstance);

    this.logger.log(`Counting stage steps for process instances`);

    // Step 1: Group parent instances by current_activity_key
    const parentStages = await repo
      .createQueryBuilder('pi')
      .select([
        'MIN(pi.current_activity_name) AS "StageName"',
        'pi.current_activity_key AS "keyName"',
        'COUNT(DISTINCT pi.id)::int AS length',
      ])
      .where('pi.tenant_id = :tenant_id', { tenant_id })
      .andWhere('pi.status = :status', { status: ProcessStatus.RUNNING })
      .andWhere('pi.current_activity_key IS NOT NULL')
      .andWhere('pi.is_subprocess = false')
      .groupBy('pi.current_activity_key')
      .getRawMany();

    for (const parent of parentStages) {
      if (!parent.keyName) {
        parent.step = [];
        continue;
      }

      const parentIds = await repo
        .createQueryBuilder('p')
        .select(['p.id'])
        .where('p.tenant_id = :tenant_id', { tenant_id })
        .andWhere('p.status = :status', { status: ProcessStatus.RUNNING })
        .andWhere('p.is_subprocess = false')
        .andWhere('p.current_activity_key = :key', { key: parent.keyName })
        .getRawMany();

      const idList = parentIds.map((p) => p.p_id);

      if (!idList.length) {
        parent.step = [];
        continue;
      }

      const childSteps = await repo
        .createQueryBuilder('child')
        .select([
          'MIN(child.current_activity_name) AS name',
          'child.current_activity_key AS keyName',
          'COUNT(DISTINCT child.id)::int AS length',
        ])
        .where('child.tenant_id = :tenant_id', { tenant_id })
        .andWhere('child.status = :status', { status: ProcessStatus.RUNNING })
        .andWhere('child.parent_instance_id IN (:...ids)', { ids: idList })
        .andWhere('child.is_subprocess = true')
        .andWhere('child.current_activity_type = :type', {
          type: 'bpmn:userTask',
        })
        .groupBy('child.current_activity_key')
        .getRawMany();

      this.logger.log(
        `Child steps for ${parent.keyName}: ${JSON.stringify(childSteps)}`,
      );

      parent.step = childSteps;
    }

    this.logger.log(
      `Stage steps counted successfully: ${JSON.stringify(parentStages)}`,
    );

    return parentStages;
  }
}
