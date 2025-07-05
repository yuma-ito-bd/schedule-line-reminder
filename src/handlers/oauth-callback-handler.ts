import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { OAuthCallbackUseCase } from "../usecases/oauth-callback-usecase";
import { OAuthStateRepository } from "../lib/oauth-state-repository";
import { Config } from "../lib/config";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { TokenRepository } from "../lib/token-repository";
import { ApiResponseBuilder } from "../lib/api-response-builder";

// 設定の初期化
const config = Config.getInstance();

export const oauthCallbackHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  await config.init();
  try {
    console.info("Start OAuth callback handler");

    // クエリパラメータから認可コードとstateを取得
    const code = event.queryStringParameters?.code;
    const state = event.queryStringParameters?.state;

    const useCase = new OAuthCallbackUseCase(
      new OAuthStateRepository(),
      new GoogleAuthAdapter(),
      new TokenRepository()
    );
    const result = await useCase.execute(code, state);

    return new ApiResponseBuilder().success(result.message);
  } catch (error) {
    console.error("Error in OAuth callback handler:", error);
    return new ApiResponseBuilder().serverError(
      "認証処理中にエラーが発生しました。"
    );
  }
};
