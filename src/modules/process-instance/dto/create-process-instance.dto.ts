export class CreateProcessInstanceDto {
  // process_definition_id: string;
  process_definition_key: string;
  business_key?: string;
  variables?: Record<string, any>;
}
