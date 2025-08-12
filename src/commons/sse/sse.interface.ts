import { Observable } from 'rxjs';

export interface SSEEventDataType {
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  entityName: string;
  data?: any;
}

export type SSEEventReturnType = Observable<MessageEvent>;
