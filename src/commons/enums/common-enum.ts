export enum NotificationType {
  EMPLOYEE = 'employee',
  FRONT_DESK = 'FRONT_DESK',
}

export enum EmailType {
  None = 'None',
  Verify_Email = 'Verify_Email',
  Forgot_Password = 'Forgot_Password',
}

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export enum UserTypeEnumConst {
  BOARD = 1,
  INDIVIDUAL = 2,
  ADMIN = 3,
}

export enum UserTypeEnum {
  BOARD = 'BOARD',
  APPLICANT = 'APPLICANT',
  ADMIN = 'ADMIN',
  ACCESSOR = 'ACCESSOR',
}

export enum AUTH_OTP_TYPE {
  enrollment_phone_otp = 'enrollment_phone_otp',
  enrollment_email_otp = 'enrollment_email_otp',
  login_phone_otp = 'login_phone_otp',
  login_email_otp = 'login_email_otp',
  forgot_password_phone_otp = 'forgot_password_phone_otp',
  forgot_password_email_otp = 'forgot_password_email_otp',
  change_phone_otp = 'change_phone_otp',
  change_email_otp = 'change_email_otp',
  password_change_phone_notification = 'password_change_phone_notification',
  password_change_email_notification = 'password_change_email_notification',
}

export enum OtpPurposeEnum {
  LOGIN = 'login',
  VERIFY = 'verify',
}
export enum UserPermissionEnum {
  P_SUPER_ADMIN = 'P_SUPER_ADMIN',
  P_READ_TENANT = 'P_READ_TENANT',
  P_EDIT_TENANT = 'P_EDIT_TENANT',
  P_READ_ROLE = 'P_READ_ROLE',
  P_EDIT_ROLE = 'P_EDIT_ROLE',
  P_CREATE_USER = 'P_CREATE_USER',
  P_EDIT_USER = 'P_EDIT_USER',
  P_BOARD_ADMIN = 'P_BOARD_ADMIN',
}

export enum TaskStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
}

export enum ProcessStatus {
  COMPLETED = 'COMPLETED',
  RUNNING = 'RUNNING',
  CANCELLED = 'CANCELLED',
}

export enum ModelType {
  BPMN = 'BPMN',
  DMN = 'DMN',
}
export enum InfraStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum DomainType {
  root_domain = 'root_domain',
  sub_domain = 'sub_domain',
}
