export async function validateUniqueFieldPerTenant<T = any>(
  repo: {
    findByCondition: (repo, condition: Partial<T>) => Promise<T[]>;
  },
  commonRepo,
  fields: Partial<T>,
  excludeId?: string | number,
): Promise<void> {
  const condition: any = {
    ...fields,
  };

  if (excludeId) {
    condition.id = { $ne: excludeId };
  }

  const existing = await repo.findByCondition(commonRepo, condition);

  if (existing.length > 0) {
    throw new Error(
      `Record with values ${JSON.stringify(fields)} already exists.`,
    );
  }
}
