import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string;

    const prismaError = exception as {
      code?: string;
      meta?: { target?: string[] };
    };
    if (prismaError?.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const target = prismaError.meta?.target?.[0];
      message =
        target === 'email'
          ? 'Un compte avec cet email existe déjà. Utilisez un autre email.'
          : target
            ? `Une entrée avec cette valeur (${target}) existe déjà.`
            : 'Doublon : cette valeur existe déjà.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      message =
        typeof resp === 'object' && resp && 'message' in resp
          ? Array.isArray((resp as { message: unknown }).message)
            ? (resp as { message: string[] }).message.join(', ')
            : String((resp as { message: string }).message)
          : String(resp);
    } else {
      message =
        exception instanceof Error
          ? exception.message
          : 'Erreur interne du serveur';
    }

    if (status === 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: { statusCode: number; message: string } = {
      statusCode: status,
      message:
        process.env.NODE_ENV !== 'production'
          ? message
          : 'Erreur interne du serveur',
    };
    res.status(status).json(body);
  }
}
