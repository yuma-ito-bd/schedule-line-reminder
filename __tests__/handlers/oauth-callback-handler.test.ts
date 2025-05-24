import { describe, it, expect, beforeEach, spyOn } from "bun:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { oauthCallbackHandler } from "../../src/handlers/oauth-callback-handler";
import { OAuthCallbackUseCase } from "../../src/usecases/oauth-callback-usecase";
import { AwsParameterFetcher } from "../../src/lib/aws-parameter-fetcher";

describe("oauthCallbackHandler", () => {
  let event: APIGatewayProxyEvent;

  beforeEach(() => {
    event = {
      queryStringParameters: { code: "code", state: "state" },
    } as any;
    // AwsParameterFetcherのモック
    spyOn(AwsParameterFetcher.prototype, "call").mockResolvedValue(
      "mock-value"
    );
  });

  it("正常系: ユースケースが呼ばれ、200とメッセージが返る", async () => {
    const mockExecute = spyOn(
      OAuthCallbackUseCase.prototype,
      "execute"
    ).mockResolvedValue({ message: "mock success" });
    const result = await oauthCallbackHandler(event);
    expect(mockExecute).toHaveBeenCalledWith("code", "state");
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("mock success");
    mockExecute.mockRestore();
  });

  it("異常系: ユースケースが例外を投げた場合、500とエラーメッセージが返る", async () => {
    const mockExecute = spyOn(
      OAuthCallbackUseCase.prototype,
      "execute"
    ).mockRejectedValue(new Error("error"));
    const result = await oauthCallbackHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("認証処理中にエラーが発生しました");
    mockExecute.mockRestore();
  });
});
