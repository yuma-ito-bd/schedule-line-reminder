import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../src/handlers/line-webhook-handler";
import { validateSignature } from "@line/bot-sdk";
import { ParameterFetcherMock } from "./mocks/parameter-fetcher-mock";
import { Config } from "../src/lib/config";
import { LineMessagingApiClient } from "../src/line-messaging-api-client";
import { LineWebhookUseCase } from "../src/usecases/line-webhook-usecase";

// Mock @line/bot-sdk
mock.module("@line/bot-sdk", () => ({
  validateSignature: mock(),
}));

describe("Unit test for app handler", function () {
  let originalConfigInstance: Config;
  let mockConfigInstance: Partial<Config>;
  let mockInit: ReturnType<typeof mock>;
  let mockLineChannelSecret: string;
  let mockHandleWebhookEvent: ReturnType<typeof mock>;
  let originalHandleWebhookEvent: typeof LineWebhookUseCase.prototype.handleWebhookEvent;

  beforeEach(() => {
    // Save original Config instance and methods
    originalConfigInstance = Config.getInstance();
    // 元のhandleWebhookEventを保存
    originalHandleWebhookEvent =
      LineWebhookUseCase.prototype.handleWebhookEvent;
    mockInit = mock().mockResolvedValue(undefined);
    mockLineChannelSecret = "test-channel-secret";
    mockHandleWebhookEvent = mock().mockResolvedValue({
      success: true,
      message: "認可URLを送信しました",
    });

    // Create a mock config instance
    mockConfigInstance = {
      init: mockInit,
      LINE_CHANNEL_SECRET: mockLineChannelSecret,
      // Add other properties if needed by the handler during these tests
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      GOOGLE_REDIRECT_URI: "test-google-redirect-uri",
      LINE_CHANNEL_ACCESS_TOKEN: "test-line-access-token",
    };

    // Mock Config.getInstance() to return our mock instance
    Config.getInstance = mock().mockReturnValue(mockConfigInstance as Config);

    // Mock LineWebhookUseCase
    LineWebhookUseCase.prototype.handleWebhookEvent = mockHandleWebhookEvent;

    // Reset validateSignature mock for each test if it's from @line/bot-sdk
    if ((validateSignature as any).mockReset) {
      (validateSignature as any).mockReset();
    }
  });

  afterEach(() => {
    // Restore original Config instance
    Config.getInstance = mock().mockReturnValue(originalConfigInstance);
    // handleWebhookEventを元に戻す
    LineWebhookUseCase.prototype.handleWebhookEvent =
      originalHandleWebhookEvent;
    // モックをリセット
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
          clientCert: {
            clientCertPem: "",
            issuerDN: "",
            serialNumber: "",
            subjectDN: "",
            validity: { notAfter: "", notBefore: "" },
          },
          cognitoAuthenticationProvider: "",
          cognitoAuthenticationType: "",
          cognitoIdentityId: "",
          cognitoIdentityPoolId: "",
          principalOrgId: "",
          sourceIp: "",
          user: "",
          userAgent: "",
          userArn: "",
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
        headers: {}, // No signature header
      } as APIGatewayProxyEvent;

      const result = await handler(event);
      expect(result.statusCode).toEqual(400);
      const body = JSON.parse(result.body);
      expect(body.message).toEqual("x-line-signature header is required");
      expect(mockInit).toHaveBeenCalled(); // Config.init should still be called
    });

    it("should return 400 if request body is missing for signature validation", async () => {
      const event: APIGatewayProxyEvent = {
        ...dummyEventBase,
        headers: { "x-line-signature": "test-signature" },
        body: null, // Missing body
      } as APIGatewayProxyEvent;

      const result = await handler(event);
      expect(result.statusCode).toEqual(400);
      const body = JSON.parse(result.body);
      expect(body.message).toEqual(
        "Request body is required for signature validation"
      );
      expect(mockInit).toHaveBeenCalled();
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
      expect(mockInit).toHaveBeenCalled();
      expect(validateSignature).toHaveBeenCalledWith(
        validBody,
        mockLineChannelSecret,
        "invalid-signature"
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
      expect(mockInit).toHaveBeenCalled();
      expect(validateSignature).toHaveBeenCalledWith(
        event.body,
        mockLineChannelSecret,
        "valid-signature"
      );
      expect(mockHandleWebhookEvent).toHaveBeenCalled();
    });
  });

  it("verifies successful response", async () => {
    (validateSignature as any).mockReturnValue(true);
    const event: APIGatewayProxyEvent = {
      // This event is for the original test, ensure it uses the mocked config
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
          clientCert: {
            clientCertPem: "",
            issuerDN: "",
            serialNumber: "",
            subjectDN: "",
            validity: { notAfter: "", notBefore: "" },
          },
          cognitoAuthenticationProvider: "",
          cognitoAuthenticationType: "",
          cognitoIdentityId: "",
          cognitoIdentityPoolId: "",
          principalOrgId: "",
          sourceIp: "",
          user: "",
          userAgent: "",
          userArn: "",
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
