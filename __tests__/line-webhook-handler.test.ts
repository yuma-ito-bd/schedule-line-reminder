import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../src/handlers/line-webhook-handler";
import { validateSignature } from "@line/bot-sdk";
import { LineWebhookUseCase } from "../src/usecases/line-webhook-usecase";

// Mock @line/bot-sdk
mock.module("@line/bot-sdk", () => ({
  validateSignature: mock(),
}));

describe("Unit test for app handler", function () {
  let mockHandleWebhookEvent: ReturnType<typeof mock>;
  let originalHandleWebhookEvent: typeof LineWebhookUseCase.prototype.handleWebhookEvent;

  beforeEach(() => {
    // handleWebhookEventを保存・モック
    originalHandleWebhookEvent = LineWebhookUseCase.prototype.handleWebhookEvent;
    mockHandleWebhookEvent = mock().mockResolvedValue({
      success: true,
      message: "認可URLを送信しました",
    });
    LineWebhookUseCase.prototype.handleWebhookEvent = mockHandleWebhookEvent;
    if ((validateSignature as any).mockReset) {
      (validateSignature as any).mockReset();
    }
  });

  afterEach(() => {
    LineWebhookUseCase.prototype.handleWebhookEvent = originalHandleWebhookEvent;
    if ((validateSignature as any).mockReset) {
      (validateSignature as any).mockReset();
    }
  });

  describe("Signature Validation", () => {
    const validBody = JSON.stringify({ events: [{ type: "message" }] });
    const dummyEventBase: Partial<APIGatewayProxyEvent> = {
      httpMethod: "post",
      headers: {},
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: "/webhook",
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "1234",
        authorizer: {},
        httpMethod: "post",
        identity: {
          accessKey: "",
          accountId: "",
          apiKey: "",
          apiKeyId: "",
          caller: "",
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "",
          user: null,
          userAgent: null,
          userArn: null,
        },
        path: "/webhook",
        protocol: "HTTP/1.1",
        requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
        requestTimeEpoch: 1428582896000,
        resourceId: "123456",
        resourcePath: "/webhook",
        stage: "dev",
      },
      resource: "",
      stageVariables: {},
    };

    it("should return 400 if x-line-signature header is missing", async () => {
      const event: APIGatewayProxyEvent = {
        ...dummyEventBase,
        body: validBody,
        headers: {},
      } as APIGatewayProxyEvent;
      const result = await handler(event);
      expect(result.statusCode).toEqual(400);
      const body = JSON.parse(result.body);
      expect(body.message).toEqual("x-line-signature header is required");
    });

    it("should return 400 if request body is missing for signature validation", async () => {
      const event: APIGatewayProxyEvent = {
        ...dummyEventBase,
        headers: { "x-line-signature": "test-signature" },
        body: null,
      } as APIGatewayProxyEvent;
      const result = await handler(event);
      expect(result.statusCode).toEqual(400);
      const body = JSON.parse(result.body);
      expect(body.message).toEqual(
        "Request body is required for signature validation"
      );
    });

    it("should return 400 if signature validation fails", async () => {
      (validateSignature as any).mockReturnValue(false);
      const event: APIGatewayProxyEvent = {
        ...dummyEventBase,
        headers: { "x-line-signature": "invalid-signature" },
        body: validBody,
      } as APIGatewayProxyEvent;
      const result = await handler(event);
      expect(result.statusCode).toEqual(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toEqual("Signature validation failed");
      expect(validateSignature).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it("should proceed to normal processing if signature is valid (mocked)", async () => {
      (validateSignature as any).mockReturnValue(true);
      const event: APIGatewayProxyEvent = {
        ...dummyEventBase,
        headers: { "x-line-signature": "valid-signature" },
        body: JSON.stringify({
          events: [
            {
              type: "message",
              message: { type: "text", text: "Hello" },
              replyToken: "test-reply-token",
              source: { type: "user", userId: "test-user-id" },
              timestamp: Date.now(),
              mode: "active",
            },
          ],
        }),
      } as APIGatewayProxyEvent;
      const result = await handler(event);
      expect(result.statusCode).toEqual(200);
      expect(validateSignature).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
      expect(mockHandleWebhookEvent).toHaveBeenCalled();
    });
  });

  it("verifies successful response", async () => {
    (validateSignature as any).mockReturnValue(true);
    const event: APIGatewayProxyEvent = {
      httpMethod: "post",
      body: JSON.stringify({
        events: [
          {
            type: "message",
            message: {
              type: "text",
              text: "カレンダー追加",
            },
            replyToken: "reply-token",
            source: {
              type: "user",
              userId: "user-id",
            },
            timestamp: 1234567890,
            mode: "active",
          },
        ],
      }),
      headers: { "x-line-signature": "valid-signature" },
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: "/webhook",
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        accountId: "123456789012",
        apiId: "1234",
        authorizer: {},
        httpMethod: "post",
        identity: {
          accessKey: "",
          accountId: "",
          apiKey: "",
          apiKeyId: "",
          caller: "",
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "",
          user: null,
          userAgent: null,
          userArn: null,
        },
        path: "/webhook",
        protocol: "HTTP/1.1",
        requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
        requestTimeEpoch: 1428582896000,
        resourceId: "123456",
        resourcePath: "/webhook",
        stage: "dev",
      },
      resource: "",
      stageVariables: {},
    };
    const result: APIGatewayProxyResult = await handler(event);
    expect(result.statusCode).toEqual(200);
    const body = JSON.parse(result.body);
    expect(body.message).toEqual("認可URLを送信しました");
    expect(mockHandleWebhookEvent).toHaveBeenCalled();
  });
});
