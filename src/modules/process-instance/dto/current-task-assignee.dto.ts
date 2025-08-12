export class CurrentTaskAssigneeDto {
  id: string;
  is_used: boolean;
  updated_at: Date;
  constructor(partial?: Partial<CurrentTaskAssigneeDto>) {
    this.id = partial?.id ?? '';
    this.is_used = partial?.is_used ?? false;
    this.updated_at = partial?.updated_at ?? new Date();
  }
}
