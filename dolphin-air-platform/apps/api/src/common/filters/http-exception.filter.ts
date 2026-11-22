import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const bodyRecord = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const code = typeof bodyRecord.error === 'string' ? bodyRecord.error : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_REJECTED';
    const message = status >= 500
      ? 'The request could not be completed.'
      : typeof bodyRecord.message === 'string' ? bodyRecord.message : 'The request was rejected.';

    if (status >= 500) {
      this.logger.error(JSON.stringify({ event: 'api.request.failed', status, method: request.method }));
    }
    response.status(status).json({ statusCode: status, error: code, message });
  }
}
