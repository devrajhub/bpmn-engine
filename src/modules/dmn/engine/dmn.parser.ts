import { Injectable, Logger } from '@nestjs/common';
import { evaluate as feelEvaluate } from 'feelin';
import * as fs from 'fs';
import * as xml2js from 'xml2js';

@Injectable()
export class DmnParser {
  private readonly logger = new Logger(DmnParser.name);

  async parseDMNXml(xml: string): Promise<DecisionTable> {
    this.logger.log(`Parsing DMN XML from string...`);
    console.log('[DMN Parser] Received XML:', xml);
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
      const parsedXML = await parser.parseStringPromise(xml);
      this.logger.log(`Successfully parsed DMN XML. ParsedXML - ${parsedXML}`);
      return this.convertDMNToJSON(parsedXML);
    } catch (error) {
      this.logger.error('Error parsing DMN XML:', error.stack);
      throw new Error('Failed to parse DMN XML string.');
    }
  }

  async loadDMNFile(filePath: string): Promise<DecisionTable> {
    this.logger.log(`Loading DMN file from: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
      const parsedXML = await parser.parseStringPromise(fileContent);
      this.logger.log(`Successfully parsed DMN XML.`);
      return this.convertDMNToJSON(parsedXML);
    } catch (error) {
      this.logger.error('Error parsing DMN XML:', error.stack);
      throw new Error('Failed to parse DMN XML file.');
    }
  }

  convertDMNToJSON(parsedXML: any): DecisionTable {
    try {
      const decisionTable = parsedXML.definitions.decision.decisionTable;
      if (!decisionTable) {
        throw new Error('No decision table found in DMN XML');
      }

      const hitPolicy = decisionTable.$.hitPolicy ?? 'UNIQUE';

      let inputColumns = [];
      if (Array.isArray(decisionTable.input)) {
        inputColumns = decisionTable.input.map((input: any) => ({
          name: input.$.label,
          type: input.inputExpression.$.typeRef,
        }));
      } else if (decisionTable.input) {
        inputColumns = [
          {
            name: decisionTable.input.$.label,
            type: decisionTable.input.inputExpression.$.typeRef,
          },
        ];
      }

      let outputColumns = [];
      if (Array.isArray(decisionTable.output)) {
        outputColumns = decisionTable.output.map((output: any) => ({
          name: output.$.name || output.$.label,
          type: output.$.typeRef,
        }));
      } else if (decisionTable.output) {
        outputColumns = [
          {
            name: decisionTable.output.$.name || decisionTable.output.$.label,
            type: decisionTable.output.$.typeRef,
          },
        ];
      }

      let rules = [];
      if (Array.isArray(decisionTable.rule)) {
        rules = decisionTable.rule.map((rule: any) => {
          let conditions = [];
          if (Array.isArray(rule.inputEntry)) {
            conditions = rule.inputEntry.map((entry: any, index: number) => {
              const text =
                entry && typeof entry.text !== 'undefined' ? entry.text : '-';
              return {
                operator: this.extractOperator(text),
                value: this.convertToType(text, inputColumns[index]?.type),
              };
            });
          } else if (rule.inputEntry) {
            const text =
              rule.inputEntry && typeof rule.inputEntry.text !== 'undefined'
                ? rule.inputEntry.text
                : '-';
            conditions = [
              {
                operator: this.extractOperator(text),
                value: this.convertToType(text, inputColumns[0]?.type),
              },
            ];
          }

          let outcomes = [];
          if (Array.isArray(rule.outputEntry)) {
            outcomes = rule.outputEntry.map((entry: any, index: number) => {
              const text =
                entry?.$?.text?.replace(/"/g, '') ??
                entry?.text?.replace(/"/g, '');

              return this.convertToType(text, outputColumns[index]?.type);
            });
          } else if (rule.outputEntry) {
            const convertBody =
              rule.outputEntry?.$?.text?.replace(/"/g, '') ??
              rule.outputEntry?.text?.replace(/"/g, '');

            outcomes = [
              this.convertToType(convertBody, outputColumns[0]?.type),
            ];
          }

          return { conditions, outcomes };
        });
      }

      let defaultOutcome: Record<string, any> = {};
      if (rules.length > 0) {
        const lastRule = rules[rules.length - 1];
        const isDefaultRule = lastRule.conditions.every((c) => {
          return c.value === '' || c.value === '-' || c.value == null;
        });

        if (isDefaultRule) {
          defaultOutcome = outputColumns.reduce(
            (acc, col, idx) => {
              acc[col.name] = lastRule.outcomes[idx];
              return acc;
            },
            {} as Record<string, any>,
          );

          rules.pop(); // Remove this fallback rule from regular rules
        }
      }

      console.log('[DMN Parser] Converted decision table:', {
        hitPolicy,
        inputColumns,
        outputColumns,
        rules,
        defaultOutcome,
      });

      return {
        hitPolicy,
        inputColumns,
        outputColumns,
        rules,
        defaultOutcome,
      };
    } catch (error) {
      this.logger.error('Error converting DMN to JSON:', error);
      throw new Error(`Failed to convert DMN to JSON: ${error.message}`);
    }
  }

  extractOperator(conditionText: string): string {
    if (!conditionText) return '=='; // Default to equality if missing
    console.log('[DMN Parser Debug] Extracting operator from:', conditionText);

    if (conditionText.startsWith('{') && conditionText.endsWith('}')) {
      try {
        const ret = feelEvaluate(conditionText.slice(1, -1));
        this.logger.debug(
          `Parsed FEEL condition: ${conditionText}, evaluated: ${ret}`,
        );
        return 'feel';
      } catch (error) {
        this.logger.error('FEEL Parsing Error:', error);
      }
    }

    // Handle range expressions like [0..100]
    if (conditionText.startsWith('[') && conditionText.endsWith(']')) {
      console.log('[DMN Parser Debug] Found range expression');
      return 'range';
    }

    // Handle comparison expressions like > 10, < 20, >= 46
    const comparisonRegex = /^(>=|<=|>|<)\s*(\d+(\.\d+)?)/;
    const comparisonMatch = comparisonRegex.exec(conditionText.trim());
    if (comparisonMatch) {
      console.log(
        '[DMN Parser Debug] Found comparison operator:',
        comparisonMatch[1],
      );
      return comparisonMatch[1];
    }

    const regex = /(>=|<=|==|!=|>|<)/;
    const match = regex.exec(conditionText);
    const operator = match ? match[0] : '==';
    console.log('[DMN Parser Debug] Final operator:', operator);
    return operator;
  }

  convertToType(value: string, type: string): any {
    if (value.startsWith('{') && value.endsWith('}')) {
      return value.slice(1, -1);
    }

    // Handle range expressions like [0..100]
    if (value.startsWith('[') && value.endsWith(']')) {
      return value;
    }

    // Handle comparison expressions like > 10, < 20, >= 46
    const comparisonRegex = /^(>=|<=|>|<)\s*(\d+(\.\d+)?)$/;
    const comparisonMatch = comparisonRegex.exec(value.trim());
    if (comparisonMatch) {
      // Return just the numeric value, the operator is handled separately
      return parseFloat(comparisonMatch[2]);
    }

    // Handle simple numeric values
    const numericRegex = /^-?\d+(\.\d+)?$/;
    if (numericRegex.test(value.trim())) {
      return parseFloat(value.trim());
    }

    if (type === 'boolean') return value.toLowerCase() === 'true';
    return value;
  }

  getInputField(inpt: any) {
    return {
      id: inpt.$.id,
      label: inpt.$.label,
      type: inpt.inputExpression.$.typeRef,
      name: inpt.$.label,
    };
  }

  getOutputField(output: any) {
    return {
      id: output.$.id,
      name: output.$.name ?? output.$.label,
      type: output.$.typeRef,
    };
  }

  documentRules(decisionTable: DecisionTable): string {
    let doc = `📄 **Decision Table Documentation**\n`;
    doc += `===================================\n`;
    doc += `🔹 **Hit Policy:** ${decisionTable.hitPolicy}\n`;
    const inputColumnsStr = decisionTable.inputColumns
      .map((col) => col.name + ':' + col.type)
      .join(', ');

    const outputColumnsStr = decisionTable.outputColumns
      .map((col) => col.name + ':' + col.type)
      .join(', ');

    doc += `🔹 **Input Columns:** ${inputColumnsStr}\n`;
    doc += `🔹 **Output Columns:** ${outputColumnsStr}\n\n`;
    doc += `📌 **Rules:**\n`;

    decisionTable.rules.forEach((rule, index) => {
      doc += `\n🔸 **Rule ${index + 1}:**\n`;
      doc += `   - **Conditions:**\n`;
      rule.conditions.forEach((condition, colIndex) => {
        doc += `     - ${decisionTable.inputColumns[colIndex].name} ${condition.operator} ${condition.value}\n`;
      });
      doc += `   - **Outcomes:**\n`;
      rule.outcomes.forEach((outcome, colIndex) => {
        doc += `     - ${decisionTable.outputColumns[colIndex].name}: ${outcome}\n`;
      });
    });

    doc += `\n✅ **Default Outcome:**\n`;
    for (const [key, value] of Object.entries(decisionTable.defaultOutcome)) {
      doc += `   - ${key}: ${value}\n`;
    }

    return doc;
  }
}

export type DecisionTable = {
  hitPolicy: string;
  inputColumns: { name: string; type: string }[];
  outputColumns: { name: string; type: string }[];
  rules: { conditions: Condition[]; outcomes: any[] }[];
  defaultOutcome: Record<string, any>;
};

export type Condition = {
  operator: string;
  value: any;
};
