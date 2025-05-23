import { describe, it, expect, mock, afterEach } from "bun:test";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../src/handlers/line-webhook-handler";
import { ParameterFetcherMock } from "./mocks/parameter-fetcher-mock";
import { Config } from "../src/lib/config";
import { LineMessagingApiClient } from "../src/line-messaging-api-client";

describe("Unit test for app handler", function () {
  afterEach(() => {
    // モックをリセット
    (LineMessagingApiClient.prototype.replyTextMessages as any).mockReset?.();
  });

  it("verifies successful response", async () => {
    // Configの初期化
    const parameterFetcher = new ParameterFetcherMock();
    await Config.getInstance().init(parameterFetcher);

    // replyTextMessagesメソッドを直接モック
    const replyTextMessagesMock = mock().mockResolvedValue({});
    (LineMessagingApiClient.prototype as any).replyTextMessages =
      replyTextMessagesMock;

    // LINE Webhookイベントのモック
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

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toEqual(200);
    const body = JSON.parse(result.body);
    expect(body.message).toEqual("認可URLを送信しました");
    expect(replyTextMessagesMock).toHaveBeenCalled();
    expect(replyTextMessagesMock.mock.calls[0][0]).toEqual("reply-token");
    expect(replyTextMessagesMock.mock.calls[0][1][0]).toEqual(
      "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください："
    );
    expect(replyTextMessagesMock.mock.calls[0][1][1]).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
  });
});
