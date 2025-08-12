import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CommonMethods } from 'src/commons/utils/common-methods';

export class CreateDmnDto {
  @ApiProperty({ example: 'LoanApproval' })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('DMN_1001') })
  name: string;

  @ApiProperty({ example: 'loan_approval_key' })
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('DMN_1002') })
  key: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  version?: number;

  @ApiProperty({ example: true })
  @IsBoolean({ message: CommonMethods.getErrorMsgCombinedString('DMN_1004') })
  @IsOptional()
  isLatest?: boolean;

  @ApiProperty({ example: '<definitions>...</definitions>' })
  @IsOptional()
  @IsString({ message: CommonMethods.getErrorMsgCombinedString('DMN_1005') })
  dmn_xml: string;
}
