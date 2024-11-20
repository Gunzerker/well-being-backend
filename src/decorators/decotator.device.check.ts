import {
  ConsoleLogger,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { device } from 'src/shared/enums';

export const Device = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();

    const agent = request.headers['user-agent'].toString();

    return agent.includes('Dart') ? device.MOBILE : device.WEB;
  },
);
