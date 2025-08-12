# bpmn-engine
Custom BPMN engine 

# Server-Driven BPMN Workflow Engine (Node.js/NestJS)
An anonymized, production-inspired workflow engine that executes BPMN 2.0–style processes and emits server-driven UI descriptors. The frontend renders screens from action keys + component schemas returned by the engine—so product teams can change flows without redeploying the FE.

Note: All company identifiers, secrets, and external endpoints are removed or generalized.

# Supported BPMN Constructs
Events: Start, End (with optional termination policy)
Tasks: User Task, Service Task (via adapter interface)
Gateways: Exclusive (XOR), Parallel (AND) with token management
Sequence Flows: Conditional expressions, default flows
Subprocess (lightweight): Inline/embedded with scoped variables (optional)
Compensation/Saga (optional): Compensation handlers for service tasks
Parallel gateways are fully supported with token synchronization and join semantics.

