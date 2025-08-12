import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CallActivityService } from 'src/modules/call-activity/call-activity.service';
import { ProcessInstanceService } from 'src/modules/process-instance/process-instance.service';
import { BpmnElement } from '../interfaces/bpmn-element.interface';

@Injectable()
export class CallActivityTaskHandler {
  private readonly logger = new Logger(CallActivityTaskHandler.name);

  constructor(
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    private readonly callActivityService: CallActivityService,
  ) {}

  async execute(
    jwt: IJwt,
    task: BpmnElement,
    context: Record<string, any>,
    instance_id: string,
    tenant_id: number,
  ): Promise<void> {
    const { dataSource } = jwt;
    try {
      this.logger.log(`Executing Call Activity Task: ${task.$.id}`);
      const extensionElements = task['bpmn:extensionElements'] ?? {};
      const calledElement = extensionElements['activity:calledElement']?.['$'];

      if (!calledElement?.processId) {
        throw new Error(
          'Called process definition ID not found in call activity task',
        );
      }
      const instanceParent = await this.processInstanceService.getInstanceById(
        dataSource,
        tenant_id,
        instance_id,
      );
      const propagateAllChildVariables =
        calledElement.propagateAllChildVariables === 'true';

      this.logger.log(
        `Starting new process instance for definition ID: ${calledElement.processId}`,
      );

      const childInstance = await this.processInstanceService.startInstance(
        {
          process_definition_key: calledElement.processId,
          // EDIT HERE CALL FOR PROCESS DEFINITION KEY INSTEAD OF PROCESS_DEFINITION_ID
          variables: propagateAllChildVariables ? context : {},
        },
        tenant_id,
        jwt.sub,
        jwt,
        instanceParent.root_instance_id,
        instanceParent.parent_instance_id,
      );
      await this.processInstanceService.updateInstance(
        jwt,
        childInstance.instance_id,
        {
          is_subprocess: true,
        },
      );
      await this.processInstanceService.updateInstance(jwt, instance_id, {
        subprocess_id: childInstance.instance_id,
        subprocess_element_id: task.$.id,
      });
      const childProcessInstance =
        await this.processInstanceService.getInstanceById(
          dataSource,
          tenant_id,
          childInstance.instance_id,
        );
      await this.callActivityService.create(dataSource, {
        parent_process_instance_id: childProcessInstance.parent_instance_id,
        root_instance_id: childProcessInstance.root_instance_id,
        child_process_instance_id: childInstance.instance_id,
        call_activity_id: task.$.id,
        call_activity_name: task.$.id,
        status: 'RUNNING',
      });

      this.logger.log(
        `Successfully started new process instance for call activity task ${task.$.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error executing call activity task: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
