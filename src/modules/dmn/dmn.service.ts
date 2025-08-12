import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { IJwt } from 'src/commons/interface/jwt.interface';
import {
  createOne,
  findByCondition,
  findByQuery,
  findOneByConditionId,
  findOneByQueryCondition,
  softDeleteOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { DataSource } from 'typeorm';
import { CreateDmnDto } from './dto/create-dmn.dto';
import { GetAllDmnDTO } from './dto/get-all-dmn.dto';
import { UpdateDmnDto } from './dto/update-dmn.dto';
import { DMNEngine } from './engine/dmn.engine';
import { DmnParser } from './engine/dmn.parser';
import { Dmn } from './entities/dmn.entity';

@Injectable()
export class DmnService {
  private readonly logger = new Logger(DmnService.name);
  constructor(private readonly dmnParser: DmnParser) {}

  async deploy(dataSource: DataSource, tenant_id: number, body: CreateDmnDto) {
    this.logger.log('Deploying DMN definition...');
    try {
      const name = body?.name;
      const key = body?.key;
      const repo = dataSource.getRepository(Dmn);

      const latest = await this.findLatestVersion(dataSource, key, tenant_id);
      const nextVersion = latest ? latest.version + 1 : 1;

      if (latest) {
        await updateOne(repo, latest.id, { isLatest: false });
      }

      const decisionTable = await this.dmnParser.parseDMNXml(body.dmn_xml);
      const dmnRecord = await createOne(repo, {
        name,
        key,
        version: nextVersion,
        isLatest: true,
        xml: body.dmn_xml,
        json: decisionTable,
        tenant_id,
      });

      this.logger.log(`Successfully deployed DMN with ID: ${dmnRecord.id}`);
      return dmnRecord;
    } catch (error) {
      this.logger.error(`Failed to deploy DMN: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to deploy DMN definition');
    }
  }

  async runDmn(
    dataSource: DataSource,
    tenant_id: number,
    key: string,
    body: any,
  ) {
    this.logger.log(
      `Running DMN evaluation for key: ${key}, tenant: ${tenant_id}`,
    );

    try {
      const dmn = await this.findLatestVersion(dataSource, key, tenant_id);

      if (!dmn) {
        throw new Error(
          `DMN with key ${key} not found for tenant ${tenant_id}`,
        );
      }

      const decisionTable = await this.dmnParser.parseDMNXml(dmn.xml);

      const engine = new DMNEngine({ debug: true });
      engine.loadDecisionTable(decisionTable);

      const result = engine.evaluate(body);

      this.logger.log(
        `DMN evaluation successful for key: ${key} with result: ${result}`,
      );
      return {
        result,
        dmnId: dmn.id,
        dmnKey: dmn.key,
        dmnName: dmn.name,
        version: dmn.version,
      };
    } catch (error) {
      this.logger.error(`DMN evaluation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to evaluate DMN decision');
    }
  }

  async findAll(tenant_id: number, jwt: IJwt, params: GetAllDmnDTO) {
    const { dataSource } = jwt;
    const { page, limit, keyword, sort, order, pageOff } = params;
    const searchColumns = [];
    const sortingColumns = sort ? [sort] : ['updated_at'];
    const orderValue = order === 'ASC' ? 1 : -1;
    console.log('Fetching dmn processes.');
    const repo = dataSource.getRepository(Dmn);

    const query = {
      is_active: true,
      is_deleted: false,
      tenant_id: tenant_id,
    };
    const options = {
      page,
      limit,
      keyword,
      searchColumns,
      undefined,
      sortingColumns,
      order: orderValue,
      pageOff,
    };
    const dmn = await findByQuery(repo, query, options);
    return dmn;
  }

  async findLatestVersion(
    dataSource: DataSource,
    key: string,
    tenant_id: number,
  ) {
    this.logger.log(
      `Finding latest DMN version for key=${key}, tenant=${tenant_id}`,
    );
    try {
      const repo = dataSource.getRepository(Dmn);
      return await findOneByQueryCondition(
        repo,
        { key, tenant_id: tenant_id }, // replace with actual column names
        undefined,
        undefined,
        ['version'],
        -1,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching latest DMN version: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch latest DMN version',
      );
    }
  }

  async findOne(dataSource: DataSource, id: string, tenant_id: number) {
    this.logger.log(`Fetching dmn by id: ${id}`);
    const repo = dataSource.getRepository(Dmn);
    try {
      return await findOneByConditionId(repo, id, {
        tenant_id: tenant_id,
      });
    } catch (error) {
      this.logger.error(`Error fetching dmn: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dmn');
    }
  }

  async update(
    dataSource: DataSource,
    id: string,
    tenant_id: number,
    updateDmnDto: UpdateDmnDto,
  ) {
    const repo = dataSource.getRepository(Dmn);
    const dmn = await findByCondition(repo, {
      id: id,
      tenant_id: tenant_id,
    });
    if (!dmn) {
      this.logger.warn(`Dmn not found for ID: ${id}`);
      throw new Error('Dmn not found');
    }
    const updatedDmn = await updateOne(repo, id, updateDmnDto as any);
    if (!updatedDmn) {
      this.logger.warn(`Dmn not updated for ID: ${id}`);
      throw new Error('Dmn not updated');
    }
    return updatedDmn;
  }

  async deleteDmn(tenant_id: number, dataSource: DataSource, id: string) {
    this.logger.log(`Deleting dmn with ID: ${id}`);
    const repo = dataSource.getRepository(Dmn);
    const dmn = await findOneByConditionId(repo, id, { tenant_id: tenant_id });

    if (!dmn) {
      this.logger.warn(`Dmn not found for ID: ${id}`);
      return { message: 'Dmn not found' };
    }

    await softDeleteOneByQuery(repo, { id });
    this.logger.log(`Deleted dmn with ID: ${id}`);

    return { message: 'Dmn deleted successfully' };
  }
}
