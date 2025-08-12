import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Domain = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const host = request.get('host');

    return host;
  },
);
