import { PrismaExceptionFilter } from "./prisma-client-exception.filter";
import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/client";

describe("PrismaClientExceptionFilter", () => {
  let filter: PrismaExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string };

  beforeEach(() => {
    filter = new PrismaExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: "/test-url",
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle P2002 Unique constraint failed", () => {
    const error = new PrismaClientKnownRequestError("Error", {
      code: "P2002",
      clientVersion: "1.0.0",
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: "Unique constraint failed",
      errorCode: "P2002",
    });
  });

  it("should handle P2025 Record not found", () => {
    const error = new PrismaClientKnownRequestError("Error", {
      code: "P2025",
      clientVersion: "1.0.0",
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: "Record not found",
      errorCode: "P2025",
    });
  });

  it("should handle PrismaClientValidationError", () => {
    const error = new PrismaClientValidationError("Invalid query", {
      clientVersion: "1.0.0",
    });

    filter.catch(error, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Invalid database query",
      errorCode: "UNKNOWN_ERROR",
    });
  });
});
