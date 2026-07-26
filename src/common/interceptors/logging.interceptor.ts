import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    const { method, originalUrl, ip } = request;
    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown>;
    const params = request.params as Record<string, unknown>;
    const userAgent = request.get("user-agent") || "";
    const now = Date.now();

    // Sanitize body to avoid logging sensitive information like passwords
    const sanitizedBody = body ? { ...body } : {};
    if ("password" in sanitizedBody) {
      sanitizedBody.password = "********";
    }

    this.logger.log(
      `[REQ] ${method} ${originalUrl} | IP: ${ip} | User-Agent: ${userAgent} | Query: ${JSON.stringify(query)} | Params: ${JSON.stringify(params)} | Body: ${JSON.stringify(sanitizedBody)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse<Response>();
        const delay = Date.now() - now;
        this.logger.log(
          `[RES] ${method} ${originalUrl} | Status: ${response.statusCode} | Time: ${delay}ms`,
        );
      }),
      catchError((error: unknown) => {
        const delay = Date.now() - now;
        const err = error as {
          status?: number;
          statusCode?: number;
          message?: string;
          stack?: string;
        };
        const statusCode = err.status || err.statusCode || 500;
        this.logger.error(
          `[ERR] ${method} ${originalUrl} | Status: ${statusCode} | Time: ${delay}ms | Error: ${err.message}`,
          err.stack,
        );
        return throwError(() => error);
      }),
    );
  }
}
