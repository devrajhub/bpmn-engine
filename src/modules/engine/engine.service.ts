import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CallActivityService } from '../call-activity/call-activity.service';
import { ProInstVariablesService } from '../pro-inst-variables/pro-inst-variables.service';
import { ProcessInstance } from '../process-instance/entities/process-instance.entity';
import { ProcessInstanceService } from '../process-instance/process-instance.service';
import { ProgramOrchestrationService } from '../program-orchestration/program-orchestration.service';
import { ExclusiveGatewayHandler } from './gateway-handlers/exclusive-gateway.handler';
import {
  BpmnElement,
  ProcessDefinition,
} from './interfaces/bpmn-element.interface';
import { BusinessRuleTaskHandler } from './task-handlers/business-rule-task.handler';
import { CallActivityTaskHandler } from './task-handlers/call-activity-task.handler';
import { MultiInstanceTaskHandler } from './task-handlers/multi-instance-task.handler';
import { ServiceTaskHandler } from './task-handlers/service-task.handler';
import { SubprocessTaskHandler } from './task-handlers/subprocess-task.handler';
import { UserTaskHandler } from './task-handlers/user-task.handler';
import { evaluateCondition } from './utils/condition-evaluator';

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);
  private readonly className = EngineService.name;

  constructor(
    private readonly serviceTaskHandler: ServiceTaskHandler,
    private readonly userTaskHandler: UserTaskHandler,
    private readonly exclusiveGatewayHandler: ExclusiveGatewayHandler,
    private readonly callActivityTaskHandler: CallActivityTaskHandler,
    private readonly subprocessTaskHandler: SubprocessTaskHandler,
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    private readonly callActivityService: CallActivityService,
    private readonly businessRuleTaskHandler: BusinessRuleTaskHandler,
    private readonly proInstVariableService: ProInstVariablesService,
    private readonly programOrchestrationService: ProgramOrchestrationService,
    private readonly multiInstanceTaskHandler: MultiInstanceTaskHandler,
  ) {}

  async startProcess(
    jwt: IJwt,
    process_def: ProcessDefinition & {
      context: any;
    },
  ): Promise<void> {
    this.logger.log('--- startProcess() called ---');
    this.logger.debug(
      `Process Context: ${JSON.stringify(process_def.context)}`,
    );

    const start_event = this.findStartEvent(process_def);
    if (!start_event) {
      this.logger.error('No start event found');
      throw new Error('No start event found');
    }

    // Record process start time
    process_def.context.start_time = new Date();

    this.logger.log(`Starting process from StartEvent: ${start_event.$.id}`);
    await this.moveToNext(jwt, start_event.$.id, process_def);
  }

  async moveToNext(
    jwt: IJwt,
    currentElementId: string,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    this.logger.log(
      `--- moveToNext() called with element_id: ${currentElementId} ---`,
    );

    // Multi-instance subprocess completion check
    const currentElement = this.findElementById(currentElementId, process_def);
    if (
      currentElement?.type === 'bpmn:subProcess' &&
      currentElement['bpmn:multiInstanceLoopCharacteristics']
    ) {
      const loopChar = currentElement['bpmn:multiInstanceLoopCharacteristics'];
      let totalInstances = 1;
      if (loopChar['bpmn:loopCardinality']) {
        const loopCardinalityElement = loopChar['bpmn:loopCardinality'];
        const cardinalityText = Array.isArray(loopCardinalityElement)
          ? loopCardinalityElement[0]
          : loopCardinalityElement;
        const cardinalityValue =
          cardinalityText._text ||
          cardinalityText._ ||
          cardinalityText ||
          cardinalityText['$']?.value;
        totalInstances = parseInt(cardinalityValue) || 1;
      }

      const { dataSource } = jwt;
      const repo = dataSource.getRepository(ProcessInstance);

      const runningSubprocesses = await repo
        .createQueryBuilder('pi')
        .where('pi.parent_instance_id = :parentId', {
          parentId: process_def.instance_id,
        })
        .andWhere('pi.subprocess_element_id = :elementId', {
          elementId: currentElement.$.id,
        })
        .andWhere('pi.status = :status', { status: 'RUNNING' })
        .getCount();

      const completedSubprocesses = totalInstances - runningSubprocesses;
      const allCompleted = completedSubprocesses >= totalInstances;

      if (!allCompleted) {
        this.logger.log(
          `Waiting for all subprocesses to complete before moving forward: ${completedSubprocesses}/${totalInstances} completed, ${runningSubprocesses} still running`,
        );
        return; // Do not move forward until all subprocesses are done
      }
    }

    const outgoingFlows = this.getOutgoingFlows(currentElementId, process_def);
    this.logger.debug(`Found ${outgoingFlows.length} outgoing flows`);

    for (const flow of outgoingFlows) {
      this.logger.debug(`Evaluating condition for flow: ${flow.$.id}`);
      const isConditionPassed = await evaluateCondition(
        jwt,
        flow,
        process_def.context ?? {},
        this.processInstanceService,
        process_def,
      );

      this.logger.debug(
        `Condition for flow ${flow.$.id}: ${isConditionPassed}`,
      );
      if (!isConditionPassed) {
        this.logger.log(`Skipping flow ${flow.$.id} due to failed condition`);
        continue;
      }

      const nextElement = this.findElementById(flow.$.targetRef, process_def);
      if (!nextElement) {
        this.logger.error(`Target element not found: ${flow.$.targetRef}`);
        throw new Error(`Target element not found: ${flow.$.targetRef}`);
      }

      const activity_id = nextElement.$.id;

      this.logger.log(`Moving to next element: ${activity_id}`);
      if (
        flow['bpmn:extensionElements']?.[
          'commonSequenceFlow:commonSequenceFlowDefinition'
        ]?.$?.statusId
      ) {
        const statusId =
          flow['bpmn:extensionElements'][
            'commonSequenceFlow:commonSequenceFlowDefinition'
          ].$.statusId;

        console.log('Status ID exists:', statusId);
        const updateWebhookDTO = {
          type: 'Application',
          update: {
            application_status: statusId,
            process_instance_id: process_def.instance_id,
          },
        };

        const updatedWebHook =
          await this.programOrchestrationService.handleWorkflowUpdate(
            updateWebhookDTO,
            process_def.tenant_id,
            jwt,
          );

        const status = updatedWebHook
          ? 'Updated web hook successfully'
          : 'Failed to update web hook';
        this.logger.debug(
          this.className,
          `${status} for dto ${JSON.stringify(updateWebhookDTO)} and tenant: ${process_def.tenant_id}`,
        );
      }

      await this.executeElement(jwt, nextElement, process_def);
    }
  }

  async executeElement(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$?.id;
    const element_type = element.type;
    this.logger.log(`--- executeElement() called for ${element_type} ---`);
    this.logger.debug(`Element ID: ${element_id}`);

    // Check if this element has multi-instance characteristics
    const hasMultiInstance = element['bpmn:multiInstanceLoopCharacteristics'];

    if (hasMultiInstance) {
      this.logger.log(
        `Element ${element_id} has multi-instance characteristics`,
      );
      await this.handleMultiInstanceTask(jwt, element, process_def);
      return;
    }

    switch (element_type) {
      case 'bpmn:serviceTask':
        await this.handleServiceTask(jwt, element, process_def);
        break;
      case 'bpmn:businessRuleTask':
        await this.handleBusinessRuleTask(jwt, element, process_def);
        break;
      case 'bpmn:subProcess':
        await this.handleSubProcess(jwt, element, process_def);
        break;
      case 'bpmn:userTask':
        await this.handleUserTask(jwt, element, process_def);
        break;
      case 'bpmn:callActivity':
        await this.handleCallActivity(jwt, element, process_def);
        break;
      case 'bpmn:exclusiveGateway':
        await this.handleExclusiveGateway(jwt, element, process_def);
        break;
      case 'bpmn:endEvent':
        await this.handleEndEvent(jwt, element, process_def);
        break;
      default:
        this.logger.warn(`Unhandled element type: ${element_type}`);
    }
  }

  private async handleMultiInstanceTask(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ) {
    const loopChar = element['bpmn:multiInstanceLoopCharacteristics'];
    let items: any[] = [];
    let cardinality: number | null = null;
    let collectionKey = '';

    if (loopChar) {
      // Check for loopCardinality as child element (not attribute)
      if (loopChar['bpmn:loopCardinality']) {
        const loopCardinalityElement = loopChar['bpmn:loopCardinality'];
        // Extract text content from the element
        const cardinalityText = Array.isArray(loopCardinalityElement)
          ? loopCardinalityElement[0]
          : loopCardinalityElement;

        // Get the text content (could be in _text, _, or direct value)
        const cardinalityValue =
          cardinalityText._text ||
          cardinalityText._ ||
          cardinalityText ||
          cardinalityText['$']?.value;
        cardinality = parseInt(cardinalityValue);
        this.logger.log(`Multi-instance with cardinality: ${cardinality}`);
        this.logger.debug(
          `LoopCardinality element: ${JSON.stringify(cardinalityText)}`,
        );
      } else if (loopChar['$']?.collection || loopChar['$']?.assigneeList) {
        collectionKey =
          loopChar['$']?.collection || loopChar['$']?.assigneeList || 'items';
        items = process_def.context?.[collectionKey] || [];
        this.logger.log(
          `Multi-instance with collection: ${collectionKey}, items: ${items.length}`,
        );
      }
    }

    if (
      (!cardinality || cardinality <= 0) &&
      (!Array.isArray(items) || items.length === 0)
    ) {
      this.logger.warn(
        'No cardinality or items found for multi-instance task. Skipping.',
      );
      return;
    }

    // The current element IS the inner task (e.g., userTask with multi-instance)
    const innerTask = element;
    this.logger.log(
      `Processing multi-instance for task type: ${innerTask.type}`,
    );

    const completionKey = `multiInstance_${element.$.id}_completed`;
    process_def.context[completionKey] =
      process_def.context[completionKey] || [];

    if (cardinality) {
      await this.multiInstanceTaskHandler.executeByCardinality(
        cardinality,
        async (idx) => {
          const instanceContext = {
            ...process_def.context,
            multiInstanceIndex: idx,
            instanceNumber: idx + 1,
          };

          switch (innerTask.type) {
            case 'bpmn:userTask': {
              const isPartOfMultiInstance =
                await this.isTaskInMultiInstanceSubprocess(
                  process_def,
                  element.$.id,
                );

              await this.userTaskHandler.execute(
                jwt,
                innerTask,
                instanceContext,
                process_def.instance_id,
                process_def.tenant_id,
                isPartOfMultiInstance,
              );
              break;
            }
            case 'bpmn:serviceTask': {
              await this.serviceTaskHandler.execute(jwt, innerTask, {
                ...process_def,
                context: instanceContext,
              });
              break;
            }
            case 'bpmn:subProcess': {
              // Get parent instance to get root instance ID
              const parentInstance =
                await this.processInstanceService.getInstanceById(
                  jwt.dataSource,
                  process_def.tenant_id,
                  process_def.instance_id,
                );

              if (!parentInstance) {
                this.logger.error(
                  `Parent instance not found for ID: ${process_def.instance_id}`,
                );
                throw new Error(
                  `Parent instance not found for ID: ${process_def.instance_id}`,
                );
              }

              await this.subprocessTaskHandler.execute(
                jwt,
                innerTask,
                process_def,
                process_def.instance_id,
                parentInstance.root_instance_id,
              );
              break;
            }
            default: {
              this.logger.warn(
                `Multi-instance for type ${innerTask.type} not implemented.`,
              );
            }
          }
          // Mark as completed
          process_def.context[completionKey].push(idx);
        },
      );
    } else {
      // Execute by collection (array-based)
      await this.multiInstanceTaskHandler.executeAll(
        items,
        async (item, idx) => {
          const instanceContext = {
            ...process_def.context,
            multiInstanceItem: item,
            multiInstanceIndex: idx,
          };

          // Optionally, set assignee if userTask
          if (innerTask.type === 'bpmn:userTask') {
            innerTask.$ = { ...innerTask.$, assignee: item };
          }

          switch (innerTask.type) {
            case 'bpmn:userTask': {
              const isPartOfMultiInstance =
                await this.isTaskInMultiInstanceSubprocess(
                  process_def,
                  element.$.id,
                );
              await this.userTaskHandler.execute(
                jwt,
                innerTask,
                instanceContext,
                process_def.instance_id,
                process_def.tenant_id,
                isPartOfMultiInstance,
              );
              break;
            }
            case 'bpmn:serviceTask': {
              await this.serviceTaskHandler.execute(jwt, innerTask, {
                ...process_def,
                context: instanceContext,
              });
              break;
            }
            case 'bpmn:subProcess': {
              // Get parent instance to get root instance ID
              const parentInstance =
                await this.processInstanceService.getInstanceById(
                  jwt.dataSource,
                  process_def.tenant_id,
                  process_def.instance_id,
                );

              if (!parentInstance) {
                this.logger.error(
                  `Parent instance not found for ID: ${process_def.instance_id}`,
                );
                throw new Error(
                  `Parent instance not found for ID: ${process_def.instance_id}`,
                );
              }

              await this.subprocessTaskHandler.execute(
                jwt,
                innerTask,
                process_def,
                process_def.instance_id,
                parentInstance.root_instance_id,
              );
              break;
            }
            default: {
              this.logger.warn(
                `Multi-instance for type ${innerTask.type} not implemented.`,
              );
            }
          }
          // Mark as completed
          process_def.context[completionKey].push(idx);
        },
      );
    }

    // After all complete, move to next
    await this.moveToNext(jwt, element.$.id, process_def);
  }

  private async handleServiceTask(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$?.id;
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
          },
        ],
      },
    );
    await this.serviceTaskHandler.execute(jwt, element, process_def);
    await this.moveToNext(jwt, element_id, process_def);
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        token_positions: [
          {
            activity_id: element_id,
            status: 'completed',
          },
        ],
      },
    );
  }

  private async handleBusinessRuleTask(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const { dataSource } = jwt;
    const element_id = element.$?.id;
    const tenant_id = process_def.tenant_id;
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
            updated_at: new Date().toISOString(),
          },
        ],
      },
    );
    const dmnId =
      element?.['bpmn:extensionElements']?.['dmn:dMNDefinition']?.['$']?.dmnId;
    if (!dmnId) {
      throw new Error('DMN ID is required for business rule task');
    }
    const resultVariable =
      element?.['bpmn:extensionElements']?.['dmn:dMNDefinition']?.['$']
        ?.resultVariable;
    if (!resultVariable) {
      throw new Error('resultVariable is required in DMN definition');
    }
    const dmnResult = await this.businessRuleTaskHandler.execute(
      dataSource,
      {
        dmnId,
        inputMap: process_def.context,
        tenant_id,
        processInstanceId: process_def.instance_id,
      },
      process_def.context,
    );
    const { decision, decisionTable } = dmnResult;
    const processInstance = await this.processInstanceService.getInstanceById(
      dataSource,
      tenant_id,
      process_def?.instance_id,
    );
    if (!decision || Object.keys(decision).length === 0) {
      this.logger.warn(
        `No decision found for DMN ID: ${dmnId} in process instance ${processInstance.id}`,
      );
      throw new Error('No DMN rule matched and no default outcome is defined.');
    }
    const outputName = Object.keys(decision)[0];
    const outputValue = decision[outputName];
    const outputDefinition = decisionTable.outputColumns.find(
      (col) => col.name === outputName,
    );
    const outputType = outputDefinition?.type || 'string';
    console.log(`Output value for DMN: ${outputValue}`);
    await this.proInstVariableService.create(dataSource, {
      key: resultVariable,
      value: outputValue,
      type: outputType,
      process_instance: processInstance,
      parent_process_instance_id: processInstance?.parent_instance_id,
      root_instance_id: processInstance?.root_instance_id,
    });
    await this.moveToNext(jwt, element_id, process_def);
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        token_positions: [
          {
            activity_id: element_id,
            status: 'completed',
            updated_at: new Date().toISOString(),
          },
        ],
      },
    );
  }

  private async handleSubProcess(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$.id;
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
            updated_at: new Date().toISOString(),
          },
        ],
      },
    );
    const parentInstance = await this.processInstanceService.getInstanceById(
      jwt.dataSource,
      process_def.tenant_id,
      process_def.instance_id,
    );
    await this.subprocessTaskHandler.execute(
      jwt,
      element,
      process_def,
      process_def.instance_id,
      parentInstance.root_instance_id,
    );
  }

  private async handleUserTask(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$?.id;
    const instance_id = process_def.instance_id;
    const tenant_id = process_def.tenant_id;
    const isPartOfMultiInstance = await this.isTaskInMultiInstanceSubprocess(
      process_def,
      element_id,
    );

    const userTask = await this.userTaskHandler.execute(
      jwt,
      element,
      process_def.context,
      instance_id,
      tenant_id,
      isPartOfMultiInstance,
    );
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
            updated_at: new Date().toISOString(),
          },
        ],
      },
    );
    const processInstanceForBulkFetch =
      await this.processInstanceService.getInstanceById(
        jwt.dataSource,
        tenant_id,
        instance_id,
      );
    const rootInstanceId = processInstanceForBulkFetch?.root_instance_id;
    const bulkFetchUserTaskDto = {
      instance_ids: [rootInstanceId],
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
    const bulkFetchUserTask = await this.processInstanceService.bulkFetch(
      tenant_id,
      jwt,
      bulkFetchUserTaskDto,
    );
    const updateWebhookDTO = {
      type: 'UserTask',
      update: {
        process_instance_id: userTask?.parent_process_instance_id,
        tenant_id: userTask?.tenant_id,
        bpm_task_id: userTask?.id,
        bpm_task_name: userTask?.name,
        action: userTask?.key,
        assignee_id: userTask?.assignee,
        candidate_group_id: userTask?.candidate_group_id,
        stage: bulkFetchUserTask.stage,
        step: bulkFetchUserTask.step,
      },
    };
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
    this.logger.log(
      `User task ${element_id} execution paused, waiting for user action`,
    );
  }

  private async handleCallActivity(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$?.id;
    const instance_id = process_def.instance_id;
    const tenant_id = process_def.tenant_id;
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
            updated_at: new Date().toISOString(),
          },
        ],
      },
    );
    await this.callActivityTaskHandler.execute(
      jwt,
      element,
      process_def.context,
      instance_id,
      tenant_id,
    );
  }

  private async handleExclusiveGateway(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const element_id = element.$?.id;
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element?.type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        token_positions: [
          {
            activity_id: element_id,
            status: 'running',
          },
        ],
      },
    );
    await this.exclusiveGatewayHandler.execute(jwt, element, process_def);
  }

  private async handleEndEvent(
    jwt: IJwt,
    element: any,
    process_def: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const { dataSource } = jwt;
    const element_id = element.$?.id;
    const element_type = element.type;
    this.logger.log(`Reached End Event: ${element_id}. Process Completed.`);
    this.logger.log(
      `Process instance ${JSON.stringify(process_def)} completed.`,
    );
    const end = new Date();
    await this.processInstanceService.updateInstance(
      jwt,
      process_def.instance_id,
      {
        status: 'COMPLETED',
        current_activity_id: element_id,
        current_activity_name: element.$?.name,
        current_activity_type: element_type,
        current_activity_key:
          element?.['bpmn:extensionElements']?.['stagename:stageNameDefinition']
            ?.$?.stagename ?? null,
        end_activity_id: element_id,
        end_time: end,
        token_positions: [
          {
            activity_id: element_id,
            status: 'completed',
          },
        ],
      },
    );
    const subprocessInstance =
      await this.processInstanceService.getInstanceById(
        dataSource,
        process_def.tenant_id,
        process_def.instance_id,
      );
    if (
      process_def?.context?.is_subprocess &&
      process_def?.context?.parent_instance_id &&
      process_def?.context?.subprocess_element_id
    ) {
      this.logger.log(
        'Subprocess end event reached, notifying parent process...',
      );
      await this.processInstanceService.updateInstance(
        jwt,
        process_def.context.parent_instance_id,
        {
          current_task_assignee: subprocessInstance.current_task_assignee,
          token_positions: [
            {
              activity_id: process_def.context.subprocess_element_id,
              status: 'completed',
              updated_at: new Date().toISOString(),
            },
          ],
        },
      );
      const parentInstance = await this.processInstanceService.getInstanceById(
        dataSource,
        process_def.context.parent_tenant_id ?? process_def.tenant_id,
        process_def.context.parent_instance_id,
      );
      if (parentInstance) {
        const parentContext = parentInstance.context ?? {};
        const parentFlowElements = parentInstance.flow_elements ?? [];
        await this.moveToNext(jwt, process_def.context.subprocess_element_id, {
          ...process_def,
          instance_id: process_def.context.parent_instance_id,
          context: parentContext,
          flow_elements: parentFlowElements,
        });
      }
      return;
    }
    const callActivity = await this.callActivityService.findByChildInstanceId(
      dataSource,
      process_def.instance_id,
    );
    this.logger.log(
      `Looking for call activity with child instance id: ${process_def.instance_id}`,
    );
    this.logger.log(`callActivity found: ${JSON.stringify(callActivity)}`);
    if (callActivity) {
      await this.callActivityService.updateStatus(
        dataSource,
        callActivity.id,
        'COMPLETED',
      );
      const parentInstance = await this.processInstanceService.getInstanceById(
        dataSource,
        process_def.tenant_id,
        callActivity.parent_process_instance_id,
      );
      if (parentInstance) {
        await this.moveToNext(jwt, callActivity.call_activity_id, {
          ...parentInstance,
          instance_id: parentInstance.id,
          context: parentInstance.context,
          flow_elements: parentInstance.flow_elements,
        });
      }
    } else {
      this.logger.log(
        `No call activity record found for child instance ${process_def.instance_id}. This process may not be a child process.`,
      );
    }
  }

  private getOutgoingFlows(
    element_id: string,
    process_def: { flow_elements: any[] },
  ): any[] {
    const flows = process_def.flow_elements.filter(
      (el) =>
        el.type?.endsWith('sequenceFlow') && el.$?.sourceRef === element_id,
    );

    this.logger.debug(
      `getOutgoingFlows() for ${element_id} found ${flows.length} flows`,
    );
    return flows;
  }

  private findElementById(
    id: string,
    process_def: { flow_elements: any[] },
  ): any | undefined {
    const found = process_def.flow_elements.find((el) => el.$?.id === id);
    if (!found) {
      this.logger.warn(
        `findElementById() couldn't find element with id: ${id}`,
      );
    }
    return found;
  }

  private findStartEvent(
    process_def: ProcessDefinition & { flow_elements: BpmnElement[] },
  ): BpmnElement | undefined {
    const start_event = process_def.flow_elements.find(
      (el) => el.type === 'bpmn:startEvent',
    );
    if (!start_event) {
      this.logger.warn('findStartEvent() did not find any start event');
    }
    return start_event;
  }

  private async isTaskInMultiInstanceSubprocess(
    bpmnProcessDefinition: any,
    taskId: string,
  ): Promise<boolean> {
    const tasks = bpmnProcessDefinition.tasks || [];

    for (const task of tasks) {
      if (task.type === 'bpmn:subProcess') {
        const multiInstance = task['bpmn:multiInstanceLoopCharacteristics'];
        if (multiInstance) {
          const innerUserTask = task['bpmn:userTask'];

          const innerTasks = Array.isArray(innerUserTask)
            ? innerUserTask
            : [innerUserTask];

          for (const inner of innerTasks) {
            if (inner?.$?.id === taskId) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
