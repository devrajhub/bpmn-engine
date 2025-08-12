import { CurrentTaskAssigneeDto } from 'src/modules/process-instance/dto/current-task-assignee.dto';
export function findLatestTaskAssignee(
  isPartOfMultiInstance: boolean,
  assignees: CurrentTaskAssigneeDto[] = [],
  created_by?: string,
): CurrentTaskAssigneeDto | null {
  assignees = Array.isArray(assignees) ? assignees : [];
  if (!Array.isArray(assignees)) {
    console.error(
      'Expected assignees to be an array, but got:',
      assignees,
      'created_by:',
      created_by,
    );
  }

  let unusedAssignees = assignees;
  if (isPartOfMultiInstance) {
    unusedAssignees = assignees.filter((a) => a.is_used === false);

    if (unusedAssignees.length === 0) {
      if (created_by) {
        return new CurrentTaskAssigneeDto({
          id: created_by,
          is_used: false,
          updated_at: new Date(),
        });
      }
      return null;
    }
  }

  if (unusedAssignees.length === 0) {
    return null;
  }

  const latest = unusedAssignees.reduce(
    (latest, current) =>
      new Date(current.updated_at) > new Date(latest.updated_at)
        ? current
        : latest,
    unusedAssignees[0],
  );

  const index = assignees.findIndex((a) => a.id === latest.id);
  if (index !== -1) {
    assignees[index].is_used = true;
    assignees[index].updated_at = new Date();
  }

  return assignees[index] ?? null;
}
