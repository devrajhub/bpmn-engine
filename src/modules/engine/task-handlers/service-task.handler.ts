// task-handlers/http-task.handler.ts
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { RestService } from 'src/commons/rest-service/rest.service';
import { DmnService } from 'src/modules/dmn/dmn.service';
import { ProInstVariablesService } from 'src/modules/pro-inst-variables/pro-inst-variables.service';
import { ProcessInstanceService } from 'src/modules/process-instance/process-instance.service';
import { DataSource } from 'typeorm';
import { BpmnElement } from '../interfaces/bpmn-element.interface';

@Injectable()
export class ServiceTaskHandler {
  private readonly logger = new Logger(ServiceTaskHandler.name);

  constructor(
    private readonly restService: RestService,
    private readonly proInstVariablesService: ProInstVariablesService,
    @Inject(forwardRef(() => ProcessInstanceService))
    private readonly processInstanceService: ProcessInstanceService,
    private readonly configService: ConfigService,
    private readonly dmnService: DmnService,
  ) {}

  async execute(jwt: IJwt, task: BpmnElement, process_def: any): Promise<void> {
    const { dataSource } = jwt;
    try {
      console.log('Executing Service Task:', task);
      const method = (
        task['bpmn:extensionElements']?.['api:requestDefinition']?.[
          'api:method'
        ]?.['$']?.value ?? 'POST'
      )?.toLowerCase() as string;
      const url =
        task['bpmn:extensionElements']?.['api:requestDefinition']?.[
          'api:url'
        ]?.['$']?.value ?? '';
      const data =
        task['bpmn:extensionElements']?.['api:requestDefinition']?.[
          'api:body'
        ]?.['$']?.value ?? {};
      const headers =
        task['bpmn:extensionElements']?.['api:requestDefinition']?.[
          'api:headers'
        ]?.['$']?.value ?? {};
      const saveResponse =
        task['bpmn:extensionElements']?.['api:requestDefinition']?.[
          'api:saveResponse'
        ]?.['$']?.value === 'true';

      const envVarMatches = url.match(/\$\{env\.([^}]+)\}/g) ?? [];
      let resolvedUrl = url;
      let dmn;

      const processInstance = await this.processInstanceService.getInstanceById(
        dataSource,
        process_def.tenant_id,
        process_def.instance_id,
      );

      for (const match of envVarMatches) {
        const envKey = match.slice(6, -1);
        const envValue = process.env[envKey] ?? this.configService.get(envKey);
        if (!envValue) {
          throw new Error(`Environment variable ${envKey} not found`);
        }

        resolvedUrl = resolvedUrl.replace(match, envValue);
      }

      const allVarsExist = true;

      let resolvedData = await this.resolveVariablesInData(
        data,
        dataSource,
        process_def,
        processInstance.parent_instance_id,
        this.proInstVariablesService,
      );

      const varMatches = resolvedUrl.match(/\$\{([^}]+)\}/g) ?? [];
      for (const match of varMatches) {
        const varName = match.slice(2, -1);
        if (varName === 'stage_id' && 'dmnKey' in resolvedData) {
          const runningToken = processInstance?.token_positions?.find(
            (token) => token.status === 'running',
          );

          if (!runningToken?.activity_id) {
            throw new Error('No running token found to extract stage_id');
          }

          resolvedUrl = resolvedUrl.replace(match, runningToken.activity_id);
          resolvedData['stage_id'] = runningToken.activity_id;
          const dmnKeyValue = resolvedData['dmnKey'];
          dmn = await this.dmnService.runDmn(
            jwt.dataSource,
            process_def.tenant_id,
            dmnKeyValue,
            resolvedData,
          );
          resolvedData = {...dmn};
          continue;
        }
        const varResult = await this.proInstVariablesService.findAll(
          dataSource,
          {
            instance_id: processInstance.parent_instance_id,
            key: varName,
          },
        );
        if (varResult.data.length === 0) {
          throw new Error(
            `${varName} variable not found in process instance variables`,
          );
        }
        resolvedUrl = resolvedUrl.replace(match, varResult.data[0]?.value);
      }

      console.log('Updated body:', resolvedData);
      console.log('Method:', method);
      console.log('resolvedUrl:', resolvedUrl);
      console.log('Body:', data);
      console.log('Headers:', headers);
      console.log('saveResponse:', saveResponse);

      let responseData;

      switch (method) {
        case 'get':
          responseData = await this.restService.get(resolvedUrl, { headers });
          break;
        case 'post':
          responseData = await this.restService.post(
            resolvedUrl,
            resolvedData,
            {
              headers,
            },
          );
          break;
        case 'put':
          responseData = await this.restService.put(resolvedUrl, resolvedData, {
            headers,
          });
          break;
        case 'patch':
          responseData = await this.restService.patch(
            resolvedUrl,
            resolvedData,
            {
              headers,
            },
          );
          break;
        case 'delete':
          responseData = await this.restService.delete(resolvedUrl, {
            headers,
          });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      console.log(
        `HTTP Task ${task.$.id} executed successfully with response:`,
        JSON.stringify(responseData),
      );

      this.logger.log(`HTTP Task ${task.$.id} succeeded.`);
      this.logger.log('Response Data:', responseData);
      if (
        allVarsExist &&
        saveResponse &&
        responseData?.variables &&
        process_def.instance_id &&
        process_def.tenant_id
      ) {
        const processInstance =
          await this.processInstanceService.getInstanceById(
            dataSource,
            process_def.tenant_id,
            process_def.instance_id,
          );
        this.logger.log('Processs Instance id:', processInstance?.id);
        this.logger.log('ResponseData Variables:', responseData?.variables);
        for (const [key, value] of Object.entries(responseData.variables)) {
          await this.proInstVariablesService.create(dataSource, {
            key,
            value,
            type: typeof value,
            process_instance: processInstance,
            parent_process_instance_id: process_def.instance_id,
            root_instance_id: processInstance.root_instance_id,
          });
        }
      }

      if (task.$.output_var) {
        process_def.context[task.$.output_var] = responseData;
      }
    } catch (error) {
      this.logger.error(`HTTP Task ${task.$.id} failed: ${error.message}`);
    }
  }

  async resolveVariablesInData(
    data: string,
    dataSource: DataSource,
    process_def: any,
    parent_process_instance_id: string,
    proInstVariablesService: ProInstVariablesService,
  ): Promise<Record<string, any>> {
    const parsedData = JSON.parse(data); // convert string to object
    const resolvedData: Record<string, any> = {};

    for (const [key, value] of Object.entries(parsedData)) {
      if (typeof value === 'string' && /^\$\{.*\}$/.test(value)) {
        const regex = /^\$\{(.*)\}$/;
        const match = regex.exec(value);
        const variableKey = match ? match[1] : undefined; // extract "applicationFee" from "${applicationFee}"

        const result = await proInstVariablesService.findAll(dataSource, {
          instance_id: parent_process_instance_id,
          key: variableKey,
        });

        if (!result.data.length) {
          throw new Error(
            `${variableKey} variable not found in process instance variables`,
          );
        }

        const variable = result.data.find((v) => v.key === variableKey);
        if (!variable) {
          throw new Error(`Variable for key "${variableKey}" not found`);
        }

        resolvedData[key] = variable.value;
      } else if (typeof value === 'object' && value !== null) {
        // recursively resolve nested objects
        resolvedData[key] = await this.resolveVariablesInData(
          JSON.stringify(value), // pass as string again
          dataSource,
          process_def,
          parent_process_instance_id,
          proInstVariablesService,
        );
      } else {
        resolvedData[key] = value;
      }
    }

    return resolvedData;
  }
}
