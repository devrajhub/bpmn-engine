// src/engine/engine.utils.ts
export function findNextTask(currentTaskId: string, sequenceFlows: any[]) {
  const flow = sequenceFlows.find((f) => f.sourceRef === currentTaskId);
  return flow?.targetRef || null;
}

export function getTaskById(tasks: any[], id: string) {
  return tasks.find((task) => task.id === id);
}
