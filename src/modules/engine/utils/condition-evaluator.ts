import { Parser } from 'expr-eval';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { ProcessInstanceService } from '../../process-instance/process-instance.service';

function safeEvalCondition(
  conditionExpression: string,
  context: Record<string, any>,
): boolean {
  try {
    // Replace ${variable} with variable name for parser to recognize
    const exprStr = conditionExpression.replace(/\${(\w+)}/g, (_, varName) => {
      const value = context[varName];
      if (typeof value === 'string') {
        return `'${value}'`;
      } else {
        return value;
      }
    });

    const parser = new Parser();
    const expr = parser.parse(exprStr);
    const result = expr.evaluate(context);

    return Boolean(result);
  } catch (e) {
    console.error('Safe expression evaluation failed:', e.message);
    return false;
  }
}

/**
 * Evaluates the flow condition and optionally updates the process instance if the condition passes.
 */
export async function evaluateCondition(
  jwt: IJwt,
  flow: any,
  context: Record<string, any>,
  processInstanceService: ProcessInstanceService,
  processDef: any,
): Promise<boolean> {
  const conditionExpression =
    flow['bpmn:extensionElements']?.['flowCondition:flowConditionDefinition']?.[
      '$'
    ]?.flowConditionLevel;

  console.log('Flow:', JSON.stringify(flow, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('Condition Expression:', conditionExpression);

  // If no condition is defined, move the token forward automatically
  if (!conditionExpression) {
    return true;
  }

  try {
    const result = safeEvalCondition(conditionExpression, context);

    console.log(
      `Evaluated condition "${conditionExpression}" with context:`,
      context,
      'Result:',
      result,
    );

    if (result) {
      await processInstanceService.updateInstance(jwt, processDef.instance_id, {
        token_positions: [
          {
            activity_id: flow.$.sourceRef,
            status: 'completed',
            outgoing: flow.$.id,
          },
        ],
      });
    }

    return result;
  } catch (error) {
    console.error(`Condition evaluation failed for ${flow.id}:`, error.message);
    return false;
  }
}
