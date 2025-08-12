import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const JWT = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.JWT;
  },
);
