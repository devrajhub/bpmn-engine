export class CheckAuthDto {
  public jwt: string;
  public apiEndPoint: string;
  public httpMethod: string;
  public protocol: string;
  public host: string;
}
