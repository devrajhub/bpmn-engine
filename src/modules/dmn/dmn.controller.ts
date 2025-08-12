import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWT } from 'src/commons/decorators/jwt.deorator';
import { SuccessResponseDto } from 'src/commons/dtos/success-response.dto';
import { IJwt } from 'src/commons/interface/jwt.interface';
import { DmnService } from './dmn.service';
import { CreateDmnDto } from './dto/create-dmn.dto';
import { GetAllDmnDTO } from './dto/get-all-dmn.dto';
import { UpdateDmnDto } from './dto/update-dmn.dto';

@ApiBearerAuth()
@ApiTags('dmns')
@Controller({
  version: '1',
  path: 'tenant/:tenant_id/dmns',
})
export class DmnController {
  constructor(private readonly dmnService: DmnService) {}

  @Post('deploy')
  @UseInterceptors(FileInterceptor('file'))
  async deploy(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenantId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateDmnDto,
  ) {
    const payload = {
      ...body,
      dmn_xml: file.buffer.toString(),
      deployed_by: jwt.sub,
    };
    return await this.dmnService.deploy(jwt.dataSource, tenantId, payload);
  }

  @Post('run/:key')
  async runDmn(
    @JWT() jwt: IJwt,
    @Param('tenant_id') tenantId: number,
    @Param('key') key: string,
    @Body() body: any,
  ) {
    return await this.dmnService.runDmn(jwt.dataSource, tenantId, key, body);
  }

  @Get()
  async findAll(
    @Param('tenant_id') tenantId: number,
    @JWT() jwt: IJwt,
    @Query() queryParams: GetAllDmnDTO,
  ) {
    const dmn = await this.dmnService.findAll(tenantId, jwt, queryParams);
    return SuccessResponseDto.getResponseObject(
      dmn,
      'Dmn successfully fetched',
      null,
      queryParams?.pageOff,
    );
  }

  @Get(':id')
  async findOne(
    @JWT() jwt: IJwt,
    @Param('id') id: string,
    @Param('tenant_id') tenant_id: number,
  ) {
    return await this.dmnService.findOne(jwt.dataSource, id, tenant_id);
  }

  @Patch(':id')
  async update(
    @JWT() jwt: IJwt,
    @Param('id') id: string,
    @Param('tenant_id') tenant_id: number,
    @Body() updateDmnDto: UpdateDmnDto,
  ) {
    return await this.dmnService.update(
      jwt.dataSource,
      id,
      tenant_id,
      updateDmnDto,
    );
  }

  @Delete(':id')
  async remove(
    @Param('tenant_id') tenant_id: number,
    @JWT() jwt: IJwt,
    @Param('id') id: string,
  ) {
    return await this.dmnService.deleteDmn(tenant_id, jwt.dataSource, id);
  }
}
