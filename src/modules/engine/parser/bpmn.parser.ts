// src/bpmn/bpmn.parser.ts
import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';

@Injectable()
export class BpmnParser {
  private readonly logger = new Logger(BpmnParser.name);

  async parseXml(xml: string): Promise<any> {
    this.logger.log('Parsing BPMN XML...');
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xml);
      this.logger.log('Successfully parsed BPMN XML.');
      return result;
    } catch (error) {
      this.logger.error('Failed to parse BPMN XML', error.stack);
      throw error;
    }
  }

  extractDefinitions(bpmnJson: any): {
    processId: string;
    name: string;
    tasks: any[];
    sequenceFlows: any[];
  } {
    this.logger.log('Extracting process definitions from BPMN JSON...');
    try {
      const process = bpmnJson['bpmn:definitions']['bpmn:process'];
      const taskTypes = [
        'bpmn:userTask',
        'bpmn:serviceTask',
        'bpmn:callActivity',
        'bpmn:subProcess',
        'bpmn:businessRuleTask',
      ];
      const gatewayTypes = ['bpmn:exclusiveGateway'];
      const startEvents = ['bpmn:startEvent'];
      const endEvents = ['bpmn:endEvent'];

      const tasks: any[] = [];

      for (const type of [
        ...taskTypes,
        ...gatewayTypes,
        ...startEvents,
        ...endEvents,
      ]) {
        const items = process[type] || [];
        const normalized = Array.isArray(items) ? items : [items];
        tasks.push(...normalized.map((item: any) => ({ ...item, type })));
      }

      const sequenceFlows = process['bpmn:sequenceFlow'] || [];
      const normalizedSequenceFlows = Array.isArray(sequenceFlows)
        ? sequenceFlows
        : [sequenceFlows];

      const exclusiveGateways = tasks.filter(
        (t) => t.type === 'bpmn:exclusiveGateway',
      );

      for (const gateway of exclusiveGateways) {
        const gatewayId = gateway.$.id;
        const outgoingFlows = normalizedSequenceFlows.filter(
          (flow) => flow.$.sourceRef === gatewayId,
        );

        const allHaveConditions = outgoingFlows.every((flow) => {
          const hasStandardCondition = !!flow['bpmn:conditionExpression'];

          const extElements = flow['bpmn:extensionElements'];
          let hasCustomCondition = false;

          if (extElements?.['flowCondition:flowConditionDefinition']) {
            const conditions =
              extElements['flowCondition:flowConditionDefinition'];
            const conditionArray = Array.isArray(conditions)
              ? conditions
              : [conditions];

            hasCustomCondition = conditionArray.some(
              (def) => !!def?.$?.flowConditionLevel?.trim(),
            );
          }

          return hasStandardCondition || hasCustomCondition;
        });

        if (!allHaveConditions) {
          const id = gatewayId;
          throw new Error(
            `Exclusive Gateway "${id}" must have a condition expression on all its outgoing sequence flows.`,
          );
        }
      }

      const output = {
        processId: process.$.id,
        name: process.$.name ?? 'Unnamed Process',
        tasks,
        sequenceFlows: normalizedSequenceFlows,
      };

      this.logger.log(
        `Extracted definitions for process ID: ${output.processId}`,
      );
      return output;
    } catch (error) {
      this.logger.error('Failed to extract process definitions', error.stack);
      throw error;
    }
  }
}
