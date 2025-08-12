import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from 'src/commons/enums/common-enum';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { findLatestTaskAssignee } from 'src/commons/utils/latest-task-assignee.util';
import { ProcessInstance } from 'src/modules/process-instance/entities/process-instance.entity';
import { ProcessInstanceService } from 'src/modules/process-instance/process-instance.service';
import { TaskService } from 'src/modules/task/task.service';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class UserTaskHandler {
  private readonly logger = new Logger(UserTaskHandler.name);

  constructor(
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  async execute(
    jwt: IJwt,
    element: any,
    context: any,
    instance_id: string,
    tenant_id: number,
    isPartOfMultiInstance?: boolean,
  ): Promise<any> {
    this.logger.log(
      `Creating user task for element::::::::::::::::::::::::::: ${JSON.stringify(element)}`,
    );

    try {
      const processInstance = await this.processInstanceService.getInstanceById(
        jwt.dataSource,
        tenant_id,
        instance_id,
      );

      if (!processInstance) {
        this.logger.error(`Process instance not found for ID: ${instance_id}`);
        throw new Error(`Process instance not found for ID: ${instance_id}`);
      }

      const extensionElements = element?.['bpmn:extensionElements'] ?? {};

      const formDefs = extensionElements?.['form:formDefinition'];
      const formDefinitions = Array.isArray(formDefs) ? formDefs : [formDefs];
      const form_key = [];

      for (const def of formDefinitions) {
        form_key.push(def?.['$']);
      }

      const rootProcessInstance =
        await this.processInstanceService.getInstanceById(
          jwt.dataSource,
          tenant_id,
          processInstance?.root_instance_id,
        );
      const latest_assignee = findLatestTaskAssignee(
        isPartOfMultiInstance,
        rootProcessInstance?.current_task_assignee,
        rootProcessInstance?.created_by,
      );

      if (
        latest_assignee &&
        !rootProcessInstance?.current_task_assignee?.find(
          (a) => a.id === latest_assignee.id,
        )
      ) {
        if (!rootProcessInstance.current_task_assignee) {
          rootProcessInstance.current_task_assignee = [];
        }
        rootProcessInstance.current_task_assignee.push(latest_assignee);
      }

      const processInstanceRepo = jwt.dataSource.getRepository(ProcessInstance);
      await processInstanceRepo.save(rootProcessInstance);
      const assignee = latest_assignee?.id;
      const taskName = element?.$?.['name'] ?? 'User Task';

      const dueDateCountStr =
        extensionElements?.['duedate:dueDateDefinition']?.$?.duedate ?? null;
      const dueDateCount = parseInt(dueDateCountStr, 10);
      const start_time = new Date();

      let due_date: Date | null = null;
      if (!isNaN(dueDateCount)) {
        due_date = new Date(start_time);
        due_date.setDate(start_time.getDate() + dueDateCount);
      }

      const candidateUsers = null;
      const candidateGroups = null;
      const priority = 0;
      const formFieldValidation = false;

      const AssigneeProfile = await this.userService.getProfile(
        jwt.authorization,
        tenant_id,
        jwt.sub,
        jwt.host,
      );

      const userTask = await this.taskService.createTask(
        jwt,
        {
          name: taskName,
          assignee: assignee,
          assignee_name: AssigneeProfile?.data?.name ?? null,
          status: TaskStatus.PENDING,
          process_instance: processInstance,
          tenant_id: tenant_id,
          proc_def_id: processInstance.process_definition_id,
          process_instance_id: processInstance.id,
          parent_process_instance_id: processInstance?.parent_instance_id,
          root_instance_id: processInstance?.root_instance_id,
          task_def_id: element.$.id,
          key:
            element?.['bpmn:extensionElements']?.[
              'stagename:stageNameDefinition'
            ]?.$?.stagename ?? null,
          start_time: start_time,
          due_date: due_date,
          candidate_users: candidateUsers,
          candidate_groups: candidateGroups,
          priority: priority,
          form_key: form_key,
          form_field_validation: formFieldValidation,
        },
        tenant_id,
      );

      this.logger.log(`User task [${userTask.id}] created successfully`);
      return userTask;
    } catch (error) {
      this.logger.error(
        `Failed to create user task for element: ${element.$.id}`,
        error.stack,
      );
      throw error;
    }
  }
}
