import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import {
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/client";

import { Request, Response } from "express";

@Catch(
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Database error";

    // ======================
    // KNOWN REQUEST ERROR
    // ======================
    if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          status = HttpStatus.CONFLICT;
          message = "Unique constraint failed";
          break;

        case "P2025":
          status = HttpStatus.NOT_FOUND;
          message = "Record not found";
          break;

        case "P2003":
          status = HttpStatus.BAD_REQUEST;
          message = "Foreign key constraint failed";
          break;

        default:
          status = HttpStatus.BAD_REQUEST;
          message = "Database constraint error";
      }
    }

    // ======================
    // VALIDATION ERROR
    // ======================
    else if (exception instanceof PrismaClientValidationError) {
      status = 400;
      message = exception.message || "Database validation error";
    }

    // ======================
    // UNKNOWN ERROR
    // ======================
    else if (exception instanceof PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Unknown database error";
    }

    // ======================
    // RUST PANIC (critical)
    // ======================
    else if (exception instanceof PrismaClientRustPanicError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = "Database engine failure";
    }

    console.log("error occurred", {
      statusCode: status,
      message,
      errorCode:
        exception instanceof PrismaClientKnownRequestError
          ? exception.code
          : "UNKNOWN_ERROR",
      path: req.url,
      timestamp: new Date().toISOString(),
      exception,
    });

    res.status(status).json({
      statusCode: status,
      message,
      errorCode:
        exception instanceof PrismaClientKnownRequestError
          ? exception.code
          : "UNKNOWN_ERROR",
    });
  }
}
