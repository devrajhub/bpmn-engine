import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { lastValueFrom, map } from 'rxjs';
import { ContextService } from '../context-service/context.service';

@Injectable()
export class RestService {
  constructor(
    private readonly httpService: HttpService,
    private readonly contextService: ContextService,
  ) {}

  private withCorrelationId(config?: AxiosRequestConfig): AxiosRequestConfig {
    const correlationId = this.contextService.getCorrelationId();
    const headers = {
      ...(config?.headers ?? {}),
      'x-correlation-id': correlationId ?? '',
    };

    return {
      ...config,
      headers,
    };
  }

  async get(url: string, requestConfig?: AxiosRequestConfig) {
    return await lastValueFrom(
      this.httpService
        .get(url, this.withCorrelationId(requestConfig))
        .pipe(map((res) => res.data)),
    );
  }

  async post(url: string, data: any, requestConfig?: AxiosRequestConfig) {
    return await lastValueFrom(
      this.httpService
        .post(url, data, this.withCorrelationId(requestConfig))
        .pipe(map((res) => res.data)),
    );
  }

  async put(url: string, data: any, requestConfig?: AxiosRequestConfig) {
    return await lastValueFrom(
      this.httpService
        .put(url, data, this.withCorrelationId(requestConfig))
        .pipe(map((res) => res.data)),
    );
  }

  async patch(url: string, data: any, requestConfig?: AxiosRequestConfig) {
    return await lastValueFrom(
      this.httpService
        .patch(url, data, this.withCorrelationId(requestConfig))
        .pipe(map((res) => res.data)),
    );
  }

  async delete(url: string, requestConfig?: AxiosRequestConfig) {
    return await lastValueFrom(
      this.httpService
        .delete(url, this.withCorrelationId(requestConfig))
        .pipe(map((res) => res.data)),
    );
  }
}
