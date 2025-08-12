import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { ProcessInstanceService } from '../../process-instance/process-instance.service';
import { EngineService } from '../engine.service';
import {
  BpmnElement,
  ProcessDefinition,
} from '../interfaces/bpmn-element.interface';

@Injectable()
export class SubprocessTaskHandler {
  private readonly logger = new Logger(SubprocessTaskHandler.name);

  constructor(
    @Inject(forwardRef(() => EngineService))
    private readonly engineService: EngineService,
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
  ) {}

  async execute(
    jwt: IJwt,
    element: BpmnElement,
    process_def: ProcessDefinition & { context: any; instance_id: string },
    parentInstanceId: string,
    rootInstanceId: string,
  ): Promise<void> {
    this.logger.log(
      `Executing embedded subprocess for element: ${element.$.id}`,
    );

    // Step 1: Extract all flow elements
    const flow_elements: BpmnElement[] = [];
    const typesToExtract = [
      'bpmn:startEvent',
      'bpmn:userTask',
      'bpmn:exclusiveGateway',
      'bpmn:endEvent',
      'bpmn:sequenceFlow',
      'bpmn:businessRuleTask',
      'bpmn:serviceTask',
    ];

    for (const type of typesToExtract) {
      this.extractElements(element, type, flow_elements);
    }

    // Step 2: Prepare subprocess context
    const subprocessContext = {
      ...(process_def.context
        ? JSON.parse(JSON.stringify(process_def.context))
        : {}),
      is_subprocess: true,
      parent_instance_id: parentInstanceId,
      subprocess_element_id: element.$.id,
    };

    const processDefinitionId = (process_def as any).id;
    const firstElement = (flow_elements[0] as any) ?? {};
    const current_activity_id = firstElement?.$?.id ?? '';
    const current_activity_type = firstElement.type ?? '';
    const current_activity_name = firstElement.name ?? '';

    // Step 3: Start subprocess
    const subprocessInstance =
      await this.processInstanceService.startSubprocessInstance(jwt, {
        process_definition_id: processDefinitionId,
        parent_instance_id: parentInstanceId,
        root_instance_id: rootInstanceId,
        tenant_id: process_def.tenant_id,
        subprocess_element_id: subprocessContext.subprocess_element_id,
        flow_elements,
        context: subprocessContext,
        current_activity_id,
        current_activity_type,
        current_activity_name,
        variables: process_def.context?.variables ?? {},
      });

    const newInstanceId = subprocessInstance.id;
    const subprocessDef = {
      ...process_def,
      context: subprocessContext,
      instance_id: newInstanceId,
      flow_elements,
      tenant_id: process_def.tenant_id,
    };

    // Step 4: Move to next
    const startEvent = flow_elements.find(
      (el) => el.type === 'bpmn:startEvent',
    );
    if (!startEvent) {
      this.logger.error('No start event found in subprocess');
      throw new Error('No start event found in subprocess');
    }

    await this.engineService.moveToNext(jwt, startEvent.$.id, subprocessDef);
  }

  // Helper function to reduce repeated code
  private extractElements(source: any, key: string, targetList: BpmnElement[]) {
    const entry = source[key];
    if (!entry) return;

    if (Array.isArray(entry)) {
      entry.forEach((el) => targetList.push({ ...el, type: key }));
    } else {
      targetList.push({ ...entry, type: key });
    }
  }
}
