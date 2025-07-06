import { describe, it, expect, beforeEach, spyOn, afterEach } from "bun:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { oauthCallbackHandler } from "../../src/handlers/oauth-callback-handler";
import { OAuthCallbackUseCase } from "../../src/usecases/oauth-callback-usecase";

describe("oauthCallbackHandler", () => {
  let event: APIGatewayProxyEvent;
  let executeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    event = {
      queryStringParameters: { code: "code", state: "state" },
    } as any;
  });

  afterEach(() => {
    executeSpy.mockRestore();
  });

  it("正常系: ユースケースが呼ばれ、200とメッセージが返る", async () => {
    executeSpy = spyOn(
      OAuthCallbackUseCase.prototype,
      "execute"
    ).mockResolvedValue({ message: "mock success" });
    const result = await oauthCallbackHandler(event);
    expect(executeSpy).toHaveBeenCalledWith("code", "state");
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("mock success");
  });

  it("異常系: ユースケースが例外を投げた場合、500とエラーメッセージが返る", async () => {
    executeSpy = spyOn(
      OAuthCallbackUseCase.prototype,
      "execute"
    ).mockRejectedValue(new Error("error"));
    const result = await oauthCallbackHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("認証処理中にエラーが発生しました");
  });
});
