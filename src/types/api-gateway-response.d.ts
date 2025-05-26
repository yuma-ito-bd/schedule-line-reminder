import type { APIGatewayProxyResult } from "aws-lambda";

export type ApiResponseBody = {
  message: string;
  data?: unknown;
};

export type ApiResponseOptions = {
  statusCode?: number;
  headers?: Record<string, string>;
  data?: unknown;
};

export type Schema$ApiResponseBuilder = {
  success: (
    message: string,
    options?: ApiResponseOptions
  ) => APIGatewayProxyResult;
  error: (
    message: string,
    options?: ApiResponseOptions
  ) => APIGatewayProxyResult;
};
