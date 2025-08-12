// src/process-instance/task.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/commons/decorators';
import { Domain } from 'src/commons/decorators/domain.decorator';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { CompleteTaskDTO } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetAllTaskDTO } from './dto/get-all-task.dto';
import { TaskService } from './task.service';

@ApiBearerAuth()
@ApiTags('Tasks')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/tasks',
})
export class TaskController {
  private readonly logger = new Logger(TaskController.name);
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async getAllTasks(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Query() query: GetAllTaskDTO,
  ) {
    const tasks = await this.taskService.getAllTasks(
      jwt.dataSource,
      tenant_id,
      jwt,
      query,
    );
    return SuccessResponseDto.getResponseObject(
      tasks,
      'Tasks successfully fetched',
      null,
      query?.pageOff,
    );
  }

  @Post()
  async createTask(
    @JWT() jwt: IJwt,
    @Body() createTask: CreateTaskDto,
    @Param('tenant_id') tenant_id: number,
  ) {
    const task = await this.taskService.createTask(jwt, createTask, tenant_id);
    return SuccessResponseDto.getResponseObject(
      task,
      'Tasks successfully created',
      null,
      null,
    );
  }

  @Post(':id/complete')
  async completeTask(
    @Param('tenant_id') tenant_id: number,
    @Param('id') taskId: string,
    @Body() body: CompleteTaskDTO,
    @JWT() jwt: IJwt,
  ) {
    const task = await this.taskService.completeTask(
      jwt,
      taskId,
      tenant_id,
      body,
    );
    return SuccessResponseDto.getResponseObject(
      task,
      'Task successfully completed',
      null,
    );
  }

  @Public()
  @Post(':id/complete/payment')
  async completePayTask(
    @Param('tenant_id') tenant_id: number,
    @Param('id') taskId: string,
    @Body() body: CompleteTaskDTO,
    @Domain() host: string,
  ) {
    const task = await this.taskService.completePaymentTask(
      taskId,
      tenant_id,
      body,
      host,
    );
    return SuccessResponseDto.getResponseObject(
      task,
      'Task payment completed successfully',
      null,
    );
  }

  @Get(':id')
  async getOne(
    @JWT() jwt: IJwt,
    @Param('id') id: string,
    @Param('tenant_id') tenantId: number,
  ) {
    const task = await this.taskService.getTaskById(
      jwt.dataSource,
      id,
      tenantId,
    );
    return SuccessResponseDto.getResponseObject(
      task,
      'Task successfully fetched',
      null,
    );
  }

  @Delete(':id')
  async deleteTask(
    @Param('tenant_id') tenantId: number,
    @Param('id') id: string,
    @JWT() jwt: IJwt,
  ) {
    this.logger.log(`DELETE /${id} called to delete task.`);
    const result = await this.taskService.deleteTask(
      jwt.dataSource,
      tenantId,
      id,
    );
    this.logger.log(`Deleted task result: ${JSON.stringify(result)}`);
    return SuccessResponseDto.getResponseObject(
      result,
      'Task successfully deleted',
      null,
    );
  }
}
