import { describe, it, expect, mock } from "bun:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { oauthCallbackHandler } from "../../src/handlers/oauth-callback-handler";

// GoogleAuthAdapterのモック
mock.module("../../src/lib/google-auth-adapter", () => ({
  GoogleAuthAdapter: mock(() => ({
    getTokensFromCode: mock(async () => ({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
    })),
  })),
}));

// OAuthStateRepositoryのモック
mock.module("../../src/lib/oauth-state-repository", () => ({
  OAuthStateRepository: mock(() => ({
    validateState: mock(async (state: string) => ({
      isValid: state === "valid-state",
      userId: state === "valid-state" ? "test-user-id" : undefined,
    })),
  })),
}));

// AwsParameterFetcherのモック
mock.module("../../src/lib/aws-parameter-fetcher", () => ({
  AwsParameterFetcher: mock(() => ({
    call: mock(async () => "test-value"),
  })),
}));

describe("oauthCallbackHandler", () => {
  const createEvent = (
    queryParams: Record<string, string>
  ): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/oauth/callback",
    pathParameters: null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: null,
    requestContext: {
      accountId: "",
      apiId: "",
      authorizer: null,
      protocol: "",
      httpMethod: "GET",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
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
      path: "/oauth/callback",
      stage: "",
      requestId: "",
      requestTimeEpoch: 0,
      resourceId: "",
      resourcePath: "",
    },
    resource: "",
    stageVariables: null,
  });

  it("認可コードとstateパラメータが正しく渡された場合、認証が成功すること", async () => {
    // Given
    const event = createEvent({
      code: "test-code",
      state: "valid-state",
    });

    // When
    const result = await oauthCallbackHandler(event);

    // Then
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "認証が完了しました。このウィンドウを閉じてください。",
    });
  });

  it("認可コードが欠落している場合、エラーを返すこと", async () => {
    // Given
    const event = createEvent({
      state: "valid-state",
    });

    // When
    const result = await oauthCallbackHandler(event);

    // Then
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "認証処理中にエラーが発生しました。",
    });
  });

  it("stateパラメータが欠落している場合、エラーを返すこと", async () => {
    // Given
    const event = createEvent({
      code: "test-code",
    });

    // When
    const result = await oauthCallbackHandler(event);

    // Then
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "認証処理中にエラーが発生しました。",
    });
  });

  it("無効なstateパラメータの場合、エラーを返すこと", async () => {
    // Given
    const event = createEvent({
      code: "test-code",
      state: "invalid-state",
    });

    // When
    const result = await oauthCallbackHandler(event);

    // Then
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "認証処理中にエラーが発生しました。",
    });
  });

  it("トークン取得に失敗した場合、エラーを返すこと", async () => {
    // Given
    const event = createEvent({
      code: "test-code",
      state: "valid-state",
    });

    // GoogleAuthAdapterのモックを上書き
    mock.module("../../src/lib/google-auth-adapter", () => ({
      GoogleAuthAdapter: mock(() => ({
        getTokensFromCode: mock(async () => {
          throw new Error("Failed to get tokens");
        }),
      })),
    }));

    // When
    const result = await oauthCallbackHandler(event);

    // Then
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "認証処理中にエラーが発生しました。",
    });
  });
});
