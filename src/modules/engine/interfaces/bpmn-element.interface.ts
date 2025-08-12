export interface BpmnElement {
  $: {
    id: string;
    type: string;
    sourceRef?: string;
    targetRef?: string;
    condition_expression?: string;
    url?: string;
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    output_var?: string;
    assignee?: string;
  };
  type: string;
}

export interface ProcessDefinition {
  instance_id: string;
  tenant_id: number;
  context?: Record<string, any>;
  flow_elements: BpmnElement[];
  engine_ref?: any;
}
