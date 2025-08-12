import { evaluate as feelEvaluate } from 'feelin';
import { Condition, DecisionTable, DmnParser } from './dmn.parser';

class DMNEngine {
  private table: DecisionTable;
  private readonly options: { debug?: boolean };

  constructor(
    options: { debug?: boolean } = {},
    private readonly parser: DmnParser = new DmnParser(),
  ) {
    this.options = options;
  }

  loadDecisionTable(decisionTable: DecisionTable): this {
    this.table = decisionTable;
    if (this.options.debug)
      console.log('[DMN] Loaded decision table:', decisionTable);
    return this;
  }

  async load(filePath: string): Promise<this> {
    this.table = await this.parser.loadDMNFile(filePath);
    if (this.options.debug) console.log(`[DMN] Loaded file: ${filePath}`);
    return this;
  }

  evaluate(input: Record<string, any> | any[]): any {
    const inputObj = Array.isArray(input)
      ? this.table.inputColumns.reduce(
          (acc, col, i) => {
            acc[col.name] = input[i];
            return acc;
          },
          {} as Record<string, any>,
        )
      : input;

    if (!this.table) throw new Error('DMN table not loaded.');

    console.log('[DMN Debug] Input object:', JSON.stringify(inputObj));
    console.log('[DMN Debug] Decision table:', JSON.stringify(this.table));

    const matchedRules = this.table.rules.filter((rule) => {
      const matches = rule.conditions.every((cond, idx) => {
        const result = this.evaluateCondition(
          this.table.inputColumns[idx].name,
          inputObj,
          cond,
        );
        console.log(
          `[DMN Debug] Evaluating condition for ${this.table.inputColumns[idx].name}:`,
          {
            condition: cond,
            value: inputObj[this.table.inputColumns[idx].name],
            result,
          },
        );
        return result;
      });
      console.log('[DMN Debug] Rule match result:', { rule, matches });
      return matches;
    });

    console.log('[DMN Debug] Matched rules:', JSON.stringify(matchedRules));

    if (matchedRules.length === 0) {
      if (this.options.debug) console.log('[DMN] No rules matched.');
      if (this.table.defaultOutcome) {
        return this.table.defaultOutcome;
      }
      throw new Error('No DMN rule matched and no default outcome is defined.');
    }

    const result = this.applyHitPolicy(matchedRules.map((r) => r.outcomes));
    console.log('[DMN Debug] Final result:', result);
    return result;
  }

  private evaluateCondition(
    inputKey: string,
    input: Record<string, any>,
    cond: Condition,
  ): boolean {
    const value = input[inputKey];

    if (cond.operator === 'feel') {
      try {
        return feelEvaluate(cond.value, value);
      } catch (e) {
        if (this.options.debug) console.error(`[DMN] FEEL parse error:`, e);
        return false;
      }
    }

    return this.compare(value, cond.operator, cond.value);
  }

  private compare(val: any, operator: string, expected: any): boolean {
    console.log('[DMN Compare Debug] Comparing:', { val, operator, expected });

    val = this.parseNumberIfPossible(val);
    expected = this.parseNumberIfPossible(expected);

    val = this.parseBooleanIfPossible(val);
    expected = this.parseBooleanIfPossible(expected);

    if (this.isExpectedWildcard(expected)) return true;
    if (expected === 'null') return val == null;

    if (this.isRangeOperator(operator, expected)) {
      const [min, max] = expected.slice(1, -1).split('..').map(Number);
      console.log('[DMN Compare Debug] Range comparison:', { val, min, max });
      return val >= min && val <= max;
    }

    switch (operator) {
      case '==':
        return val === expected;
      case '!=':
        return val !== expected;
      case '>':
        return val > expected;
      case '<':
        return val < expected;
      case '>=':
        return val >= expected;
      case '<=':
        return val <= expected;
      default:
        if (this.options.debug)
          console.error(`[DMN] Unknown operator: ${operator}`);
        return false;
    }
  }

  private parseNumberIfPossible(value: any): any {
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value);
    }
    return value;
  }

  private parseBooleanIfPossible(value: any): any {
    if (
      typeof value === 'string' &&
      (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')
    ) {
      return value.toLowerCase() === 'true';
    }
    return value;
  }

  private isExpectedWildcard(expected: any): boolean {
    return expected === '-' || expected === null || expected === undefined;
  }

  private isRangeOperator(operator: string, expected: any): boolean {
    return (
      operator === 'range' &&
      typeof expected === 'string' &&
      expected.startsWith('[') &&
      expected.endsWith(']')
    );
  }

  private applyHitPolicy(outcomes: any[][]): any {
    const policy = this.table.hitPolicy;
    const columns = this.table.outputColumns;

    switch (policy) {
      case 'FIRST':
      case 'PRIORITY':
      case 'UNIQUE':
        return this.formatOutput(outcomes[0]);

      case 'COLLECT':
      case 'RULE ORDER':
        return outcomes.map((out) => this.formatOutput(out));

      case 'SUM':
        return columns.reduce(
          (acc, col, idx) => {
            acc[col.name] = outcomes.reduce(
              (sum, o) => sum + (typeof o[idx] === 'number' ? o[idx] : 0),
              0,
            );
            return acc;
          },
          {} as Record<string, number>,
        );

      case 'COUNT':
        return outcomes.length;

      case 'MIN':
        return columns.reduce(
          (acc, col, idx) => {
            acc[col.name] = Math.min(
              ...outcomes
                .map((o) => o[idx])
                .filter((x) => typeof x === 'number'),
            );
            return acc;
          },
          {} as Record<string, number>,
        );

      default:
        return this.formatOutput(outcomes[0]);
    }
  }

  private formatOutput(outcomes: any[]): Record<string, any> {
    return this.table.outputColumns.reduce(
      (acc, col, idx) => {
        acc[col.name] = outcomes[idx];
        return acc;
      },
      {} as Record<string, any>,
    );
  }
}

export { DMNEngine };
