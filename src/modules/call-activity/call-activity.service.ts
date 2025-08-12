import { Injectable, Logger } from '@nestjs/common';
import {
  createOne,
  findOneByQuery,
  updateOne,
} from 'src/commons/repository/common.repository';
import { DataSource } from 'typeorm';
import { CreateCallActivityDto } from './dto/create-call-activity.dto';
import { CallActivity } from './entities/call-activity.entity';

@Injectable()
export class CallActivityService {
  private readonly logger = new Logger(CallActivityService.name);

  constructor() {}

  async create(
    dataSource: DataSource,
    createCallActivityDto: CreateCallActivityDto,
  ) {
    try {
      const repo = dataSource.getRepository(CallActivity);
      const callActivity = await createOne(repo, createCallActivityDto);
      return callActivity;
    } catch (error) {
      this.logger.error(
        `Error creating call activity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByParentInstanceId(
    dataSource: DataSource,
    parentInstanceId: string,
  ) {
    try {
      const repo = dataSource.getRepository(CallActivity);
      const callActivity = await findOneByQuery(repo, {
        parent_process_instance_id: parentInstanceId,
      });
      return callActivity;
    } catch (error) {
      this.logger.error(
        `Error finding call activities by parent instance ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByChildInstanceId(dataSource: DataSource, childInstanceId: string) {
    try {
      const repo = dataSource.getRepository(CallActivity);
      const result = await findOneByQuery(repo, {
        child_process_instance_id: childInstanceId,
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Error finding call activities by child instance ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateStatus(
    dataSource: DataSource,
    id: string,
    status: string,
  ): Promise<CallActivity> {
    try {
      const repo = dataSource.getRepository(CallActivity);
      return await updateOne(repo, id, { status });
    } catch (error) {
      this.logger.error(
        `Error updating call activity status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
