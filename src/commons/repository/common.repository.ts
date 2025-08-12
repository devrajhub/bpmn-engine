import { BadRequestException } from '@nestjs/common';
import {
  DeepPartial,
  Equal,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ILike,
  In,
  Repository,
} from 'typeorm';
import { FilterQueryDto } from '../dtos/filter-query.dto';
import { QueryResponse } from '../interface/common.interface';
import { CommonMethods } from '../utils/common-methods';

export async function findAll(
  repo: Repository<any>,
  skip?: number,
  take?: number,
  paginate: boolean = false,
): Promise<QueryResponse<any>> {
  try {
    console.debug('findAll');
    const findOptions: FindManyOptions<any> = {
      where: {
        is_active: true,
        is_deleted: false,
      } as unknown as FindOptionsWhere<any>,
      take: take ?? undefined,
      skip: skip ?? undefined,
    };
    const [data, total] = await Promise.all([
      repo.find(findOptions),
      repo.count(findOptions),
    ]);
    if (paginate && skip && take) {
      return {
        total,
        skip: skip ?? 0,
        limit: take ?? 0,
        data,
      };
    } else {
      return {
        total,
        data,
      };
    }
  } catch (error) {
    console.error(`find all error, ${error}`);
    throw error;
  }
}

export async function findOneByQuery(
  repo: Repository<any>,
  filterQuery: any,
  relations?: string[],
  projectionColumns?: string[] | object,
): Promise<any> {
  try {
    console.debug(`findOneByQuery, ${filterQuery}`);

    const findOptions: any = {
      where: {
        is_active: true,
        is_deleted: false,
        ...filterQuery,
      } as FindOptionsWhere<any>,
      relations,
    };
    if (projectionColumns) {
      if (
        Array.isArray(projectionColumns) ||
        typeof projectionColumns === 'object'
      ) {
        findOptions.select = projectionColumns;
      }
    }
    return await repo.findOne(findOptions);
  } catch (error) {
    console.error(`findOneByQuery error, ${error}`);
    throw error;
  }
}

export async function findOneByQueryCondition(
  repo: Repository<any>,
  filterQuery: any,
  searchQuery?: string,
  searchColumns?: string[],
  sortingColumns?: string[] | object[],
  order?: number,
  relations?: string[],
) {
  try {
    console.log(
      `findOneByQueryCondition filterQuery: ${JSON.stringify(filterQuery)}`,
    );
    console.log(`findOneByQueryCondition searchQuery: ${searchQuery}`);
    console.log(`findOneByQueryCondition searchColumns: ${searchColumns}`);
    console.log(
      `findOneByQueryCondition sortingColumns: ${JSON.stringify(sortingColumns)}`,
    );
    console.log(`findOneByQueryCondition order: ${order}`);

    // Initialize dynamic query conditions
    let dynamicQueryConditions: any = {};

    // Build dynamic query conditions from filterQuery
    for (const key in filterQuery) {
      if (filterQuery[key] !== undefined) {
        dynamicQueryConditions[key] = filterQuery[key];
      }
    }

    // Handle search functionality
    if (searchQuery && searchColumns) {
      dynamicQueryConditions = searchColumns
        .map((column) => {
          return { [column]: ILike(`%${searchQuery}%`) };
        })
        .reduce((prev, curr) => ({ ...prev, ...curr }), dynamicQueryConditions);
    }

    // Prepare the find options
    const findOptions: any = {
      where: dynamicQueryConditions,
      relations,
    };

    // Handle sorting
    if (sortingColumns && sortingColumns.length > 0) {
      findOptions.order = {};
      sortingColumns.forEach((column) => {
        if (typeof column === 'string') {
          findOptions.order[column] = order === 1 ? 'ASC' : 'DESC';
        } else if (typeof column === 'object') {
          findOptions.order = { ...findOptions.order, ...column };
        }
      });
    }

    console.log(
      `findOneByQueryCondition findOptions: ${JSON.stringify(findOptions)}`,
    );

    // Execute the query
    return await repo.findOne(findOptions);
  } catch (error) {
    console.error(`findOneByQueryCondition error: ${error}`);
    throw error;
  }
}

export async function findOneByOptions(
  repo: Repository<any>,
  query: FindOneOptions,
): Promise<any> {
  try {
    console.debug(`FindOneByOptions , ${JSON.stringify(query)}`);
    return await repo.findOne(query);
  } catch (error) {
    console.error(`findOneBy id error, ${error}`);
    throw error;
  }
}

export async function findOneById(
  repo: Repository<any>,
  id: number | string,
  relations: string[] = [],
  projectionColumns?: object,
): Promise<any> {
  try {
    console.debug(`findOneBy id , ${id}`);
    const findOptions: FindManyOptions<any> = {
      where: {
        id,
        is_active: true,
        is_deleted: false,
      } as unknown as FindOptionsWhere<any>,
      relations,
      select: projectionColumns,
    };
    return await repo.findOne(findOptions);
  } catch (error) {
    console.error(`findOneBy id error, ${error}`);
    throw error;
  }
}

export async function createOne(
  repo: Repository<any>,
  item: DeepPartial<any>,
): Promise<any> {
  try {
    console.debug(`createOne item: ${JSON.stringify(item)}`);
    return repo.save(item);
  } catch (error) {
    console.error(`createOne error: ${error}`);
    throw error;
  }
}

export async function createBulk(
  repo: Repository<any>,
  items: DeepPartial<any>[],
): Promise<any[]> {
  try {
    console.debug(`createBulk items: ${JSON.stringify(items)}`);
    return await repo.save(items);
  } catch (error) {
    console.error(`createBulk error: ${error}`);
    throw error;
  }
}

export async function updateOne(
  repo: Repository<any>,
  id: number | string,
  item: DeepPartial<any>,
  relations: string[] = [],
): Promise<any> {
  try {
    console.debug(`updateOne id: ${id}`);
    console.debug(`updateOne item: ${JSON.stringify(item)}`);
    await repo.update(id, item);
    return await findOneByConditionId(
      repo,
      id,
      { is_deleted: false },
      relations,
    );
  } catch (error) {
    console.error(`updateOne error: ${error}`);
    throw error;
  }
}

export async function findOneByConditionId(
  repo: Repository<any>,
  id: string | number,
  condition: any,
  relations: string[] = [],
): Promise<any> {
  try {
    console.debug(`findOneBy id , ${id}`);
    const findOptions: FindManyOptions<any> = {
      where: {
        id,
        ...condition,
      } as unknown as FindOptionsWhere<any>,
      relations,
    };
    return await repo.findOne(findOptions);
  } catch (error) {
    console.error(`findOneBy id error, ${error}`);
    throw error;
  }
}

export async function deleteOne(
  repo: Repository<any>,
  id: number | string,
): Promise<void> {
  try {
    console.debug(`deleteOne id: ${id}`);
    await repo.delete(id);
  } catch (error) {
    console.error(`deleteOne error: ${error}`);
    throw error;
  }
}

export async function deleteByCondition(
  repo: Repository<any>,
  condition: any,
): Promise<void> {
  try {
    console.debug(
      `deleteByCondition with condition: ${JSON.stringify(condition)}`,
    );

    const result = await repo.delete(condition);

    if (result.affected === 0) {
      console.warn(
        `No records deleted with condition: ${JSON.stringify(condition)}`,
      );
    } else {
      console.debug(
        `Successfully deleted record(s) with condition: ${JSON.stringify(condition)}`,
      );
    }
  } catch (error) {
    console.error(`deleteByCondition error: ${error}`);
    throw error;
  }
}

export async function findByIds(
  repo: Repository<any>,
  ids: (string | number)[],
  relations: string[] = [],
  projectionColumns?: string[] | object,
): Promise<any[]> {
  try {
    console.debug(`findByIds, ${ids}`);
    const findOptions: FindManyOptions<any> = {
      where: {
        id: In(ids),
        is_active: true,
        is_deleted: false,
      } as unknown as FindOptionsWhere<any>,
      relations,
    };
    if (projectionColumns) {
      if (
        Array.isArray(projectionColumns) ||
        typeof projectionColumns === 'object'
      ) {
        findOptions.select = projectionColumns;
      }
    }
    return await repo.find(findOptions);
  } catch (error) {
    console.error(`findByIds error, ${error}`);
    throw error;
  }
}

export async function softDeleteOneByQuery(
  repo: Repository<any>,
  condition: any,
  isMapped?: boolean,
  keys?: Array<string>,
): Promise<any> {
  try {
    const query = { where: { ...condition, is_deleted: false } };
    const existingItem = await findOneByOptions(repo, query);
    if (!existingItem) {
      throw new BadRequestException(CommonMethods.getErrorMsg('E_1011'));
    }
    if (isMapped && existingItem['is_mapped']) {
      throw new BadRequestException(CommonMethods.getErrorMsg('E_1014'));
    }
    if (keys?.length) {
      const epochTime = Date.now();
      for (const key of keys) {
        if (existingItem[key]) {
          existingItem[key] = `${existingItem[key]}_${epochTime}`;
        }
      }
    }
    const updatedItem = await repo.save({
      ...existingItem,
      is_deleted: true,
      is_active: false,
    });
    return updatedItem;
  } catch (error) {
    console.error(`softDeleteOne error: ${error}`);
    throw error;
  }
}

export async function findByQuery(
  repo: Repository<any>,
  filterQuery: FilterQueryDto,
  options?: QueryOptions,
): Promise<QueryResponse<any>> {
  try {
    let { page = 1, limit = 10 } = options ?? {};

    const {
      searchQuery = '',
      searchColumns = [],
      projectionColumns = [],
      sortingColumns = [],
      order = 1,
      pageOff = false,
      relations = [],
    } = options ?? {};
    console.debug(`findByQuery filterQuery: ${JSON.stringify(filterQuery)}`);
    console.debug(`findByQuery page: ${page}`);
    console.debug(`findByQuery limit: ${limit}`);
    console.debug(`findByQuery searchQuery: ${searchQuery}`);
    console.debug(`findByQuery searchColumns: ${searchColumns}`);
    console.debug(
      `findByQuery projectionColumns: ${JSON.stringify(projectionColumns)}`,
    );
    console.debug(`findByQuery sortingColums: ${sortingColumns}`);
    console.debug(`findByQuery order: ${order}`);
    console.debug(`findByQuery pageOff: ${pageOff}`);

    let dynamicQueryConditions: any = {};
    let skip = 0;
    for (const key in filterQuery) {
      if (filterQuery[key] !== undefined) {
        dynamicQueryConditions[key] = filterQuery[key];
      }
    }

    if (searchQuery && searchColumns) {
      dynamicQueryConditions = searchColumns
        .map((column) => {
          if (column == 'email') {
            return {
              [column]: Equal(`${searchQuery}`),
              ...dynamicQueryConditions,
            };
          } else {
            return {
              [column]: ILike(`%${searchQuery}%`),
              ...dynamicQueryConditions,
            };
          }
        })
        .filter(Boolean);
    }
    const findOptions: any = {
      where: dynamicQueryConditions,
      relations,
    };

    if (projectionColumns) {
      if (
        Array.isArray(projectionColumns) ||
        typeof projectionColumns === 'object'
      ) {
        findOptions.select = projectionColumns;
      }
    }

    if (!pageOff) {
      page = page ?? 1;
      limit = limit ?? 10;
      skip = (page - 1) * limit;
      findOptions.skip = skip;
      findOptions.take = limit;
    }
    if (sortingColumns && sortingColumns.length > 0) {
      findOptions.order = {};
      sortingColumns.forEach((column) => {
        const [relation, columnAlias] = column.split('.');

        if (columnAlias && relations.includes(relation)) {
          findOptions.order[relation] = {
            [columnAlias]: order === 1 ? 'ASC' : 'DESC',
          };
        } else {
          findOptions.order[column] = order === 1 ? 'ASC' : 'DESC';
        }
      });
    }
    console.debug(`findByQuery findOptions: ${JSON.stringify(findOptions)}`);
    const [data, total] = await repo.findAndCount(findOptions);
    if (!pageOff) {
      return {
        total,
        skip: findOptions?.skip ?? 0,
        page,
        limit,
        data,
      };
    } else {
      return {
        data,
      };
    }
  } catch (error) {
    console.error(`findByQuery error: ${error}`);
    throw error;
  }
}

export async function findCountByQuery(
  repo: Repository<any>,
  filterQuery: FilterQueryDto,
): Promise<number> {
  try {
    console.debug(
      `findCountByQuery filterQuery: ${JSON.stringify(filterQuery)}`,
    );
    const dynamicQueryConditions: any = {};
    for (const key in filterQuery) {
      if (filterQuery[key] !== undefined) {
        dynamicQueryConditions[key] = filterQuery[key];
      }
    }
    const findOptions: any = {
      where: dynamicQueryConditions,
    };
    console.debug(
      `findCountByQuery findOptions: ${JSON.stringify(findOptions)}`,
    );
    const count = await repo.count(findOptions);
    return count;
  } catch (error) {
    console.error(`findCountByQuery error: ${error}`);
    throw error;
  }
}

export async function search(
  repo: Repository<any>,
  searchString: string,
  columns: string[],
  projectionColumns?: string[],
  sortingColums?: string[],
  order?: number,
): Promise<any[]> {
  try {
    console.debug(`search searchString: ${searchString}`);
    console.debug(`search columns: ${columns}`);
    console.debug(`search projectionColumns: ${projectionColumns}`);
    const searchQuery = `%${searchString}%`;
    const searchConditions: any = {};
    if (Array.isArray(columns)) {
      columns.forEach((column) => {
        searchConditions[column] = ILike(searchQuery);
      });
    }
    const sortOptions: any = {};
    if (sortingColums && sortingColums.length > 0 && order) {
      sortingColums.forEach((column) => {
        sortOptions[column] = order === 1 ? 'ASC' : 'DESC';
      });
    }
    const projection: any = {};
    if (projectionColumns.length > 0) {
      projection.select = projectionColumns;
    }

    console.debug(
      `search searchConditions: ${JSON.stringify(searchConditions)}`,
    );
    console.debug(`search projection: ${JSON.stringify(projection)}`);
    console.debug(`search sortOptions: ${JSON.stringify(sortOptions)}`);

    return repo.find({
      where: searchConditions,
      ...projection,
      order: sortOptions,
    });
  } catch (error) {
    console.error(`search error: ${error}`);
    throw error;
  }
}

export async function findByCondition(
  repo: Repository<any>,
  filterQuery: any,
  relations?: string[],
  projectionColumns?: string[] | object,
): Promise<any[]> {
  try {
    console.debug(`findByQuery filterQuery: ${JSON.stringify(filterQuery)}`);
    console.debug(`findByQuery relations: ${relations}`);

    // Build dynamic query conditions from the filter query
    const dynamicQueryConditions: any = {};
    for (const key in filterQuery) {
      if (filterQuery[key] !== undefined) {
        dynamicQueryConditions[key] = filterQuery[key];
      }
    }

    // Build find options
    const findOptions: any = {
      where: dynamicQueryConditions,
      relations,
    };
    if (projectionColumns) {
      if (
        Array.isArray(projectionColumns) ||
        typeof projectionColumns === 'object'
      ) {
        findOptions.select = projectionColumns;
      }
    }

    console.debug(`findByQuery findOptions: ${JSON.stringify(findOptions)}`);

    // Fetch the results
    const data = await repo.find(findOptions);

    return data;
  } catch (error) {
    console.error(`findByQuery error: ${error}`);
    throw error;
  }
}

export async function executeRawQuery(
  repo: Repository<any>,
  query: string,
  parameters: any[] = [],
): Promise<any[]> {
  try {
    console.debug(`executeRawQuery query: ${query}`);
    console.debug(`executeRawQuery parameters: ${JSON.stringify(parameters)}`);
    const result = await repo.query(query, parameters);
    return result;
  } catch (error) {
    console.error(`executeRawQuery error: ${error}`);
    throw error;
  }
}

export async function findAllByQuery(
  repo: Repository<any>,
  filterQuery: FilterQueryDto,
  options: QueryOptions,
): Promise<QueryResponse<any>> {
  try {
    let { page = 1, limit = 10 } = options ?? {};
    const {
      searchQuery = '',
      searchColumns = [],
      projectionColumns = [],
      sortingColumns = [],
      order = 1,
      pageOff = false,
      relations = [],
    } = options ?? {};
    console.debug(`findByQuery filterQuery: ${JSON.stringify(filterQuery)}`);
    console.debug(`findByQuery page: ${page}`);
    console.debug(`findByQuery limit: ${limit}`);
    console.debug(`findByQuery searchQuery: ${searchQuery}`);
    console.debug(`findByQuery searchColumns: ${searchColumns}`);
    console.debug(
      `findByQuery projectionColumns: ${JSON.stringify(projectionColumns)}`,
    );
    console.debug(`findByQuery sortingColums: ${sortingColumns}`);
    console.debug(`findByQuery order: ${order}`);
    console.debug(`findByQuery pageOff: ${pageOff}`);

    let dynamicQueryConditions: any = {};
    let skip = 0;
    for (const key in filterQuery) {
      if (filterQuery[key] !== undefined) {
        dynamicQueryConditions[key] = filterQuery[key];
      }
    }

    if (searchQuery && searchColumns.length > 0) {
      dynamicQueryConditions = searchColumns
        .map((column) => {
          if (column == 'email') {
            return {
              [column]: Equal(`${searchQuery}`),
              ...dynamicQueryConditions,
            };
          } else {
            return {
              [column]: ILike(`%${searchQuery}%`),
              ...dynamicQueryConditions,
            };
          }
        })
        .filter(Boolean);
    }
    const findOptions: any = {
      where: dynamicQueryConditions,
      relations,
    };
    if (projectionColumns) {
      findOptions.select = projectionColumns;
    }
    if (!pageOff) {
      page = page ?? 1;
      limit = limit ?? 10;
      skip = (page - 1) * limit;
      findOptions.skip = skip;
      findOptions.take = limit;
    }
    if (sortingColumns && sortingColumns.length > 0) {
      findOptions.order = {};
      sortingColumns.forEach((column) => {
        const [relation, columnAlias] = column.split('.');

        if (columnAlias && relations[relation]) {
          findOptions.order[relation] = {
            [columnAlias]: order === 1 ? 'ASC' : 'DESC',
          };
        } else {
          findOptions.order[column] = order === 1 ? 'ASC' : 'DESC';
        }
      });
    }
    console.debug(`findByQuery findOptions: ${JSON.stringify(findOptions)}`);
    const [data, total] = await repo.findAndCount(findOptions);
    if (!pageOff) {
      return {
        total,
        skip: findOptions?.skip ?? 0,
        page,
        limit,
        data,
      };
    } else {
      return {
        data,
      };
    }
  } catch (error) {
    console.error(`findByQuery error: ${error}`);
    throw error;
  }
}

interface QueryOptions {
  page?: number;
  limit?: number;
  searchQuery?: string;
  searchColumns?: string[];
  projectionColumns?: object;
  sortingColumns?: string[];
  order?: number;
  pageOff: boolean;
  relations?: string[];
}
