import type { APIGatewayProxyResult } from "aws-lambda";
import type {
  ApiResponseBody,
  ApiResponseOptions,
  Schema$ApiResponseBuilder,
} from "../types/api-gateway-response";

export class ApiResponseBuilder implements Schema$ApiResponseBuilder {
  private readonly defaultHeaders = {
    "Content-Type": "application/json; charset=utf-8",
  };

  success(
    message: string,
    options?: ApiResponseOptions
  ): APIGatewayProxyResult {
    return this.buildResponse({
      statusCode: options?.statusCode ?? 200,
      message,
      data: options?.data,
      headers: options?.headers,
    });
  }

  clientError(
    message: string,
    options?: ApiResponseOptions
  ): APIGatewayProxyResult {
    return this.buildResponse({
      statusCode: options?.statusCode ?? 400,
      message,
      data: options?.data,
      headers: options?.headers,
    });
  }

  serverError(
    message: string,
    options?: ApiResponseOptions
  ): APIGatewayProxyResult {
    return this.buildResponse({
      statusCode: options?.statusCode ?? 500,
      message,
      data: options?.data,
      headers: options?.headers,
    });
  }

  private buildResponse({
    statusCode,
    message,
    data,
    headers,
  }: {
    statusCode: number;
    message: string;
    data?: unknown;
    headers?: Record<string, string>;
  }): APIGatewayProxyResult {
    const body: ApiResponseBody = {
      message,
    };

    if (data !== undefined) {
      body.data = data;
    }

    return {
      statusCode,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
      body: JSON.stringify(body),
    };
  }
}
