// import { Injectable } from '@nestjs/common';
// import { QueryResponse } from 'src/common/interfaces/query-response.interface';
// import {
//   DataSource,
//   EntityTarget,
//   ObjectLiteral,
//   Repository,
//   SelectQueryBuilder,
// } from 'typeorm';

// @Injectable()
// export class CommonQueryBuilderRepository<T extends ObjectLiteral> {
//   private repo: Repository<T>;

//   constructor(
//     private readonly dataSource: DataSource,
//     private entity: EntityTarget<T>,
//     private readonly repoLogger: Logger,
//   ) {
//     this.repo = this.dataSource.getRepository(entity);
//   }

//   getQueryBuilder(alias: string): SelectQueryBuilder<T> {
//     return this.repo.createQueryBuilder(alias);
//   }

//   async findByQueryBuilder(
//     alias: string,
//     filterQuery: Record<string, any>,
//     page?: number,
//     limit?: number,
//     searchQuery?: string,
//     searchColumns?: string[],
//     projectionColumns?: string[] | object,
//     sortingColumns?: string[],
//     order?: number,
//     pageOff: boolean = false,
//     relations?: string[],
//     joins?: {
//       type: 'leftJoin' | 'innerJoin' | 'rightJoin';
//       relation: string;
//       alias: string;
//       condition?: string;
//       parameters?: Record<string, any>;
//     }[],
//     computedColumns?: {
//       alias: string;
//       subQuery: (qb: SelectQueryBuilder<T>) => string;
//     }[],
//   ): Promise<QueryResponse<T>> {
//     try {
//       this.repoLogger.debug(
//         `findByQueryBuilder filterQuery: ${JSON.stringify(filterQuery)}`,
//       );

//       const qb = this.repo.createQueryBuilder(alias);

//       // Default soft-delete & active
//       qb.where(`${alias}.is_active = :is_active`, { is_active: true }).andWhere(
//         `${alias}.is_deleted = :is_deleted`,
//         { is_deleted: false },
//       );

//       // Filters
//       for (const key in filterQuery) {
//         const paramKey = `filter_${key}`;
//         qb.andWhere(`${alias}.${key} = :${paramKey}`, {
//           [paramKey]: filterQuery[key],
//         });
//       }

//       // Search
//       if (searchQuery && searchColumns?.length) {
//         qb.andWhere(
//           new Brackets((qbWhere) => {
//             searchColumns.forEach((column, index) => {
//               const param = `search_${index}`;
//               if (column === 'email') {
//                 qbWhere.orWhere(`${alias}.${column} = :${param}`, {
//                   [param]: searchQuery,
//                 });
//               } else {
//                 qbWhere.orWhere(`${alias}.${column} ILIKE :${param}`, {
//                   [param]: `%${searchQuery}%`,
//                 });
//               }
//             });
//           }),
//         );
//       }

//       // Joins
//       joins?.forEach(
//         ({ type, relation, alias: joinAlias, condition, parameters }) => {
//           qb[type](relation, joinAlias, condition, parameters);
//         },
//       );

//       // Eager-load relations
//       relations?.forEach((relation) => {
//         const relAlias = relation.replace('.', '_');
//         qb.leftJoinAndSelect(`${alias}.${relation}`, relAlias);
//       });

//       // Projection
//       if (projectionColumns) {
//         if (Array.isArray(projectionColumns)) {
//           qb.select(projectionColumns.map((col) => `${alias}.${col}`));
//         } else if (typeof projectionColumns === 'object') {
//           qb.select(projectionColumns);
//         }
//       }

//       // Add computed (custom) columns like subqueries
//       computedColumns?.forEach(({ alias: colAlias, subQuery }) => {
//         qb.addSelect(subQuery(qb), colAlias);
//       });

//       // Sorting
//       if (sortingColumns?.length) {
//         sortingColumns.forEach((column) => {
//           const [relation, columnAlias] = column.split('.');
//           if (columnAlias) {
//             qb.addOrderBy(
//               `${relation}_${columnAlias}`,
//               order === 1 ? 'ASC' : 'DESC',
//             );
//           } else {
//             qb.addOrderBy(`${alias}.${column}`, order === 1 ? 'ASC' : 'DESC');
//           }
//         });
//       }

//       // Pagination
//       let total = 0;
//       if (!pageOff) {
//         page = page || 1;
//         limit = limit || 10;
//         const skip = (page - 1) * limit;
//         qb.skip(skip).take(limit);
//         total = await qb.getCount();
//       }

//       const data = await qb.getRawMany(); // getRawMany to include computed fields
//       const response: QueryResponse<T> = { data };

//       if (!pageOff) {
//         Object.assign(response, {
//           total,
//           page,
//           limit,
//           skip: (page - 1) * limit,
//         });
//       }

//       return response;
//     } catch (error) {
//       this.repoLogger.error(`findByQueryBuilder error: ${error}`);
//       throw error;
//     }
//   }
// }
