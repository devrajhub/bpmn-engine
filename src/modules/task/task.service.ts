// src/process-instance/task.service.ts
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, UserPermissionEnum } from 'src/commons/enums/common-enum';
import { IJwt } from 'src/commons/interface/jwt.interface';
import {
  createOne,
  findByQuery,
  findOneByConditionId,
  findOneById,
  softDeleteOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { CommonMethods } from 'src/commons/utils/common-methods';
import { getOrCreateSchemeConnection } from 'src/config/domain-scheme-connection';
import { DataSource, DeepPartial } from 'typeorm';
import { EngineService } from '../engine/engine.service';
import { ProInstVariable } from '../pro-inst-variables/entities/pro-inst-variable.entity';
import { ProcessDefinitionService } from '../process-definition/process-definition.service';
import { ProcessInstanceService } from '../process-instance/process-instance.service';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { TenantService } from '../tenants/tenants.service';
import { CompleteTaskDTO } from './dto/complete-task.dto';
import { GetAllTaskDTO } from './dto/get-all-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  private readonly className = TaskService.name;
  constructor(
    @Inject(forwardRef(() => EngineService))
    private readonly engineService: EngineService,
    private readonly processDefinitionService: ProcessDefinitionService,
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    private readonly tenantService: TenantService,
    private readonly programOrchestrationService: ProgramOrchestrationService,
  ) {}

  // Inside your TaskService

  async createTask(jwt: IJwt, payload: any, tenant_id: number): Promise<Task> {
    const { dataSource } = jwt;
    const repo = dataSource.getRepository(Task);
    console.log(
      `Creating Task for tenant_id ${tenant_id} and payload: ${payload}`,
    );
    const newTask = await createOne(repo, payload);

    if (payload?.form_key) {
      const bulkFetchDto = {
        instance_ids: [payload?.parent_process_instance_id],
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
          'flow_elements',
          'token_positions',
          'is_subprocess',
          'subprocess_id',
        ],
      };
      const bulkFetch = await this.processInstanceService.bulkFetch(
        tenant_id,
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
        `Updating web hook for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${tenant_id}`,
      );
      const updatedWebHook =
        await this.programOrchestrationService.handleWorkflowUpdate(
          updateWebhookDTO,
          tenant_id,
          jwt,
        );
      if (!updatedWebHook) {
        this.logger.debug(
          this.className,
          `Failed to Update web hook for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${tenant_id}`,
        );
      } else {
        this.logger.debug(
          this.className,
          `Updated web hook successfully for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${tenant_id}`,
        );
      }
    }

    return newTask;
  }

  async claimTask(
    dataSource: DataSource,
    taskId: string,
    userId: string,
  ): Promise<Task> {
    const repo = dataSource.getRepository(Task);
    const task = await findOneById(repo, taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new Error('Task is not in pending state');
    }

    const updatedTask = await updateOne(repo, taskId, {
      assignee: userId,
      claim_time: new Date(),
      status: TaskStatus.CLAIMED,
    });

    return updatedTask;
  }

  // get all task for a particular process id
  async getAllTasks(
    dataSource: DataSource,
    tenant_id: number,
    jwt: IJwt,
    params: GetAllTaskDTO,
  ) {
    const {
      page,
      limit,
      keyword,
      sort,
      order,
      pageOff,
      process_instance_id,
      parent_process_instance_id,
      candidate_group_id,
      status,
      activity_key,
    } = params;
    const query: {
      is_active: boolean;
      is_deleted: boolean;
      status?: TaskStatus;
      tenant_id: number;
      assignee?: string;
      candidate_group_id?: string;
      process_instance_id?: string;
      parent_process_instance_id?: string;
      key?: string;
    } = {
      is_active: true,
      is_deleted: false,
      tenant_id: tenant_id,
      assignee: jwt.sub,
    };
    if (status) {
      query.status = status;
    }
    if (process_instance_id) {
      query.process_instance_id = process_instance_id;
    }

    if (parent_process_instance_id) {
      query.parent_process_instance_id = parent_process_instance_id;
    }
    if (activity_key) {
      query.key = activity_key;
    }
    if (candidate_group_id) {
      delete query.assignee;
      query.candidate_group_id = candidate_group_id;
    }

    const repo = dataSource.getRepository(Task);
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_BOARD_ADMIN)) {
      delete query.assignee;
    }
    if (jwt?.permission_ids?.includes(UserPermissionEnum.P_SUPER_ADMIN)) {
      delete query.tenant_id;
      delete query.assignee;
    }

    const searchColumns = [];
    const sortingColumns = sort ? [sort] : ['updated_at'];
    const orderValue = order === 'ASC' ? 1 : -1;

    console.log('Fetching tasks for process instance ID:', process_instance_id);
    const options = {
      page,
      limit,
      keyword,
      searchColumns,
      undefined,
      sortingColumns,
      order: orderValue,
      pageOff,
      relations: ['variables'],
    };

    const tasks = await findByQuery(repo, query, options);
    return tasks;
  }

  async getTaskById(dataSource: DataSource, id: string, tenant_id: number) {
    this.logger.log(`Fetching task by id: ${id}`);
    try {
      const repo = dataSource.getRepository(Task);
      return await findOneByConditionId(repo, id, {
        tenant_id: tenant_id,
      });
    } catch (error) {
      this.logger.error(`Error fetching task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch task');
    }
  }

  async completeTask(
    jwt: IJwt,
    taskId: string,
    tenant_id: number,
    body?: CompleteTaskDTO,
  ) {
    const { dataSource } = jwt;
    // Log: Task retrieval process
    console.log(`completeTask: Attempting to retrieve task with ID: ${taskId}`);
    const repo = dataSource.getRepository(Task);
    const VarRepo = dataSource.getRepository(ProInstVariable);
    const task = await findOneById(repo, taskId);
    console.log('completeTask: Retrieved task:', task);

    if (!task) {
      console.log(`completeTask: Task with ID ${taskId} not found`);
      throw new NotFoundException('Task not found');
    }

    if (body?.variables?.length) {
      console.log(
        'completeTask: Variables received for task completion:',
        body.variables,
      );

      const root_instance_id = task.root_instance_id;

      for (const variable of body.variables) {
        const existingVar = await VarRepo.findOne({
          where: {
            key: variable.key,
            root_instance_id: root_instance_id,
          },
        });

        if (existingVar) {
          existingVar.value = variable?.value;
          existingVar.type = variable.type ?? 'string';
          existingVar.updated_by = task.assignee;
          await VarRepo.save(existingVar);
        } else {
          await VarRepo.save({
            key: variable.key,
            value: variable?.value,
            type: variable.type ?? 'string',
            root_instance_id: root_instance_id,
            current_process_instance_id: task.process_instance_id,
            parent_process_instance_id: task?.parent_process_instance_id,
            task_id: taskId,
            task_def_id: task.task_def_id,
            created_by: task.assignee,
            updated_by: task.assignee,
          });
        }
      }
    }

    const updatePayload: Partial<Task> = {
      end_time: new Date(),
      duration: task.start_time
        ? Date.now() - new Date(task.start_time).getTime()
        : null,
      status: TaskStatus.COMPLETED,
    };

    console.log(
      'completeTask: Updating task status and duration:',
      updatePayload,
    );
    const updatedTask = await updateOne(repo, taskId, updatePayload);
    console.log('completeTask: Updated task:', updatedTask);

    const process_def = await this.getprocess_def(
      dataSource,
      task.proc_def_id,
      tenant_id,
      task.process_instance_id,
    );
    console.log('completeTask: Retrieved process definition:', process_def);

    console.log('completeTask: Moving task to the next step in the process...');
    await this.engineService.moveToNext(jwt, task.task_def_id, process_def);
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        token_positions: [
          {
            activity_id: task.task_def_id,
            status: 'completed',
          },
        ],
      },
    );
    return updatedTask;
  }

  async completePaymentTask(
    taskId: string,
    tenant_id: number,
    body: CompleteTaskDTO,
    host: string,
  ) {
    const tenant = await this.tenantService.getTenantsByIds([tenant_id], host);

    if (!tenant) {
      throw new NotFoundException(CommonMethods.getErrorMsg('TNT_1002'));
    }
    const subdomain = tenant.domain_name.split('.')[0];
    const dataSource = await getOrCreateSchemeConnection(
      subdomain,
      tenant.db_secret_manager,
    );
    const jwt = {
      isAdmin: false,
      sub: '',
      permission_ids: '',
      role: '',
      dataSource,
      host: '',
      authorization: '',
    };
    const response = await this.completeTask(jwt, taskId, tenant_id, body);
    return response;
  }
  async updateTask(
    id: string,
    updateTaskDto: UpdateTaskDto,
    dataSource: DataSource,
  ) {
    const repo = dataSource.getRepository(Task);
    console.log(`Updating task with id ${id}`);
    const task = await findOneById(repo, id);
    if (!task) {
      this.logger.warn(`Task not found for ID: ${id}`);
      throw new Error('Task not found');
    }
    const taskData = Object.fromEntries(
      Object.entries(updateTaskDto).filter(([key]) => key !== 'variables'),
    );
    const updatedTask = await updateOne(
      repo,
      id,
      taskData as DeepPartial<Task>,
    );
    if (!updatedTask) {
      this.logger.warn(`Task not updated for ID: ${id}`);
      throw new Error('Task not updated');
    }
    return updatedTask;
  }

  async getprocess_def(dataSource, pro_def_id, tenant_id, instance_id) {
    const processInstance = await this.processInstanceService.getInstanceById(
      dataSource,
      tenant_id,
      instance_id,
    );
    const pi: any = processInstance;

    if (pi.is_subprocess && pi.flow_elements.length > 0) {
      return {
        instance_id: pi.id,
        tenant_id: pi.tenant_id,
        ...pi,
        context: pi.context ?? {},
        flow_elements: pi.flow_elements,
      };
    }

    const processDefinition = await this.processDefinitionService.findById(
      dataSource,
      pro_def_id,
    );

    const flow_elements = [
      ...processDefinition.tasks.map((task) => ({
        ...task,
        type: task.type ?? task['type'] ?? task['$type'],
      })),
      ...processDefinition.sequence_flows.map((flow) => ({
        ...flow,
        type: 'sequenceFlow',
      })),
    ];
    const context: Record<string, any> = {};

    const processDefForEngine = {
      instance_id: instance_id,
      tenant_id: tenant_id,
      ...processDefinition,
      context,
      flow_elements,
    };

    return processDefForEngine;
  }

  async deleteTask(dataSource: DataSource, tenant_id: number, id: string) {
    this.logger.log(`Deleting task with ID: ${id}`);
    const repo = dataSource.getRepository(Task);
    const task = await findOneByConditionId(repo, id, {
      tenant_id: tenant_id,
    });

    if (!task) {
      this.logger.warn(`Task not found for ID: ${id}`);
      return { message: 'Task not found' };
    }

    await softDeleteOneByQuery(repo, { id });
    this.logger.log(`Deleted task with ID: ${id}`);

    return { message: 'Task deleted successfully' };
  }
}
