import { DeepPartial, Repository } from 'typeorm';
export interface QueryResponse<T> {
  total?: number;
  skip?: number;
  limit?: number;
  page?: number;
  data: T[];
}
export interface CommonRepository<T, FilterQueryDto> {
  findAll(
    repo: Repository<T>,
    skip?: number,
    take?: number,
    paginate?: boolean,
  ): Promise<QueryResponse<T>>;
  findOneById(repo: Repository<T>, id: string): Promise<T>;
  findOneByQuery(repo: Repository<T>, filterQuery: FilterQueryDto): Promise<T>;
  createOne(repo: Repository<T>, item: DeepPartial<T>): Promise<T>;
  updateOne(repo: Repository<T>, id: string, item: DeepPartial<T>): Promise<T>;
  deleteOne(repo: Repository<T>, id: string): Promise<void>;
  findCountByQuery(
    repo: Repository<T>,
    filterQuery: FilterQueryDto,
  ): Promise<number>;
  findByQuery(
    repo: Repository<T>,
    filterQuery: FilterQueryDto,
    skip?: number,
    take?: number,
    searchQuery?: string,
    searchColumns?: string[],
    projectionColumns?: string[],
    sortingColums?: string[],
    order?: number,
    paginate?: boolean,
  ): Promise<QueryResponse<T>>;
}

interface DropdownOption {
  key: any;
  value: any;
}

interface ExcelColumnConfig {
  header: string;
  key: string;
  width?: number;
  dropdownOptions?: DropdownOption[];
  multiSelect?: boolean;
}

export interface ExcelSheetConfig {
  sheetName: string;
  columns: ExcelColumnConfig[];
  rowCount: number;
}
