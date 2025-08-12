// src/engine/engine.context.ts
export class EngineContext {
  instanceId: string;
  currentTaskId: string;
  variables: Record<string, any>;

  constructor(instanceId: string, variables: Record<string, any> = {}) {
    this.instanceId = instanceId;
    this.variables = variables;
  }

  setVariable(key: string, value: any) {
    this.variables[key] = value;
  }

  getVariable(key: string) {
    return this.variables[key];
  }

  setCurrentTask(taskId: string) {
    this.currentTaskId = taskId;
  }

  getCurrentTask() {
    return this.currentTaskId;
  }
}
