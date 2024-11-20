import { HttpStatus } from '@nestjs/common';

export const apiReturner = (
  statusCode: HttpStatus,
  message?: string,
  data?: any,
) => ({ statusCode: statusCode.toString(), message, data });
