import { UserTypeEnumConst } from './common-enum';

export const UserTypeEnumLabels: Record<UserTypeEnumConst, string> = {
  [UserTypeEnumConst.BOARD]: 'Board',
  [UserTypeEnumConst.INDIVIDUAL]: 'Individual',
  [UserTypeEnumConst.ADMIN]: 'Admin',
};
