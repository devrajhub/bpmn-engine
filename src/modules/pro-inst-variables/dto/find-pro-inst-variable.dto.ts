import { FilterQueryDto } from 'src/commons/dtos/filter-query.dto';

export class FindProInstVariableDto extends FilterQueryDto {
  parent_process_instance_id: string;
  tenant_id?: number;
  key: string;
}
