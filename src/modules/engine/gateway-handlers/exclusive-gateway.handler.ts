// gateway-handlers/exclusive-gateway.handler.ts
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { findByQuery } from 'src/commons/repository/common.repository';
import { ProInstVariable } from 'src/modules/pro-inst-variables/entities/pro-inst-variable.entity';
import { ProcessInstanceService } from '../../process-instance/process-instance.service';
import { EngineService } from '../engine.service';
import {
  BpmnElement,
  ProcessDefinition,
} from '../interfaces/bpmn-element.interface';
import { evaluateCondition } from '../utils/condition-evaluator';

@Injectable()
export class ExclusiveGatewayHandler {
  private readonly logger = new Logger(ExclusiveGatewayHandler.name);

  constructor(
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    @Inject(forwardRef(() => EngineService))
    private readonly engineService: EngineService,
  ) {}

  async execute(
    jwt: IJwt,
    gateway: BpmnElement,
    processDef: ProcessDefinition & {
      context: any;
      flow_elements: BpmnElement[];
    },
  ): Promise<void> {
    const { dataSource } = jwt;
    this.logger.log(`Processing exclusive gateway: ${gateway.$.id}`);
    const processInstance = await this.processInstanceService.getInstanceById(
      dataSource,
      processDef.tenant_id,
      processDef.instance_id,
    );
    const variableRepo = dataSource.getRepository(ProInstVariable);
    const variableResponse = await findByQuery(
      variableRepo,
      {
        parent_process_instance_id: processInstance?.parent_instance_id,
      } as any,
      {
        page: undefined,
        limit: undefined,
        searchQuery: undefined,
        searchColumns: undefined,
        projectionColumns: undefined,
        sortingColumns: undefined,
        order: undefined,
        pageOff: true,
      },
    );
    const variableRecords = variableResponse?.data ?? [];
    const context = variableRecords.reduce(
      (acc, variable) => {
        acc[variable.key] = this.parseVariableValue(variable.value);
        return acc;
      },
      {} as Record<string, any>,
    );

    const flows = processDef.flow_elements.filter(
      (el) =>
        el.type?.endsWith('sequenceFlow') && el.$.sourceRef === gateway.$.id,
    );

    this.logger.debug('Filtered flows:', flows);

    let selectedFlow: any = null;
    let nextElement: any = null;

    for (const flow of flows) {
      const passed = await evaluateCondition(
        jwt,
        flow,
        context,
        this.processInstanceService,
        processDef,
      );
      if (passed) {
        selectedFlow = flow;
        nextElement = processDef.flow_elements.find(
          (el) => el.$.id === flow.$.targetRef,
        );
      }
    }

    if (selectedFlow && nextElement) {
      await this.processInstanceService.updateInstance(
        jwt,
        processDef.instance_id,
        {
          token_positions: [
            {
              activity_id: gateway.$.id,
              status: 'completed',
              outgoing: selectedFlow.$.id,
              updated_at: new Date().toISOString(),
            },
          ],
        },
      );

      this.logger.log(`Executing next element: ${nextElement.$.id}`);
      await this.engineService.executeElement(jwt, nextElement, processDef);

      const unselectedFlows = flows.filter(
        (flow) => flow.$.id !== selectedFlow.$.id,
      );
      for (const flow of unselectedFlows) {
        const targetElement = processDef.flow_elements.find(
          (el) => el.$.id === flow.$.targetRef,
        );
        if (targetElement) {
          await this.processInstanceService.updateInstance(
            jwt,
            processDef.instance_id,
            {
              token_positions: [
                {
                  activity_id: targetElement.$.id,
                  status: 'skipped',
                  updated_at: new Date().toISOString(),
                },
              ],
            },
          );
        }
      }
    }
  }
  parseVariableValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
