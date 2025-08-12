import { Injectable, Logger } from '@nestjs/common';
import { findOneByQueryCondition } from 'src/commons/repository/common.repository';
import { DmnService } from 'src/modules/dmn/dmn.service';
import { DMNEngine } from 'src/modules/dmn/engine/dmn.engine';
import { DmnParser } from 'src/modules/dmn/engine/dmn.parser';
import { Dmn } from 'src/modules/dmn/entities/dmn.entity';
import { ProInstVariablesService } from 'src/modules/pro-inst-variables/pro-inst-variables.service';
import { DataSource } from 'typeorm';

@Injectable()
export class BusinessRuleTaskHandler {
  private readonly logger = new Logger(BusinessRuleTaskHandler.name);

  constructor(
    private readonly dmnEngine: DMNEngine,
    private readonly dmnService: DmnService,
    private readonly proInstVariablesService: ProInstVariablesService,
    private readonly dmnParser: DmnParser,
  ) {}

  async execute(
    dataSource: DataSource,
    task: any,
    context: Record<string, any>,
  ) {
    try {
      const { dmnId, inputMap, tenant_id, processInstanceId } = task;

      if (!dmnId) {
        throw new Error('DMN ID is required for business rule task');
      }

      if (!tenant_id) {
        throw new Error('Tenant ID is required for business rule task');
      }

      if (!processInstanceId) {
        throw new Error(
          'Process Instance ID is required for business rule task',
        );
      }
      const dmnRepo = dataSource.getRepository(Dmn);
      const dmn = await findOneByQueryCondition(
        dmnRepo,
        { key: dmnId, tenant_id: tenant_id },
        undefined,
        undefined,
        ['version'],
        -1,
      );
      if (!dmn) {
        throw new Error(`DMN with ID ${dmnId} not found`);
      }

      const decisionTable = await this.dmnParser.parseDMNXml(dmn.xml);
      console.log(
        '[BusinessRuleTask] Parsed decision table:',
        JSON.stringify(decisionTable),
      );

      const processVariables =
        await this.proInstVariablesService.findOneByProcessInstanceId(
          dataSource,
          processInstanceId,
        );

      const processInputMap = {};
      for (const variable of processVariables) {
        if (variable.type === 'number' || !isNaN(Number(variable.value))) {
          processInputMap[variable.key] = Number(variable.value);
        } else if (variable.type === 'boolean') {
          processInputMap[variable.key] =
            variable.value.toLowerCase() === 'true';
        } else {
          processInputMap[variable.key] = variable.value;
        }
      }

      Object.keys(processInputMap).forEach((key) => {
        if (key === 'undefined') {
          delete processInputMap[key];
        }
      });

      const finalInputMap = { ...processInputMap, ...inputMap };

      this.dmnEngine.loadDecisionTable(decisionTable);
      const decision = this.dmnEngine.evaluate(finalInputMap);
      this.logger.log(
        `Business rule task executed successfully for DMN: ${dmn.key}`,
      );

      return {
        ...context,
        decision,
        dmnName: dmn.key,
        dmnKey: dmn.key,
        decisionTable,
        processVariables,
      };
    } catch (error) {
      this.logger.error(
        `Error executing business rule task: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
