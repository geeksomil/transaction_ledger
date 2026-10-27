import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || 'Error';

        if (resp.existing_transaction) {
          response.status(status).json({
            success: false,
            statusCode: status,
            error,
            message,
            existing_transaction: resp.existing_transaction,
          });
          return;
        }
      } else {
        message = exceptionResponse;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
    });
  }
}
