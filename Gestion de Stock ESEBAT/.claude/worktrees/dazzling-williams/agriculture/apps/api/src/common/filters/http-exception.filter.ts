import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import type { ErrorResponse } from '@agriculture/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Une erreur interne est survenue';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errResponse = exception.getResponse();
      if (typeof errResponse === 'object' && errResponse !== null) {
        const body = errResponse as Record<string, unknown>;
        code = (body.code as string) || `HTTP_${status}`;
        message = (body.message as string) || exception.message;
        details = body.details;
      } else {
        message = String(errResponse);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    }

    const errorResponse: ErrorResponse = {
      error: { code, message, details },
    };

    response.status(status).json(errorResponse);
  }
}
