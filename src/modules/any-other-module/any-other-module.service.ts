import { Injectable } from '@nestjs/common';

@Injectable()
export class AnyOtherModuleService {
  public get isConnected(): boolean {
    return true;
  }
}
