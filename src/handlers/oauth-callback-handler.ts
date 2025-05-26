import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { OAuthCallbackUseCase } from "../usecases/oauth-callback-usecase";
import { OAuthStateRepository } from "../lib/oauth-state-repository";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { TokenRepository } from "../lib/token-repository";
import { ApiResponseBuilder } from "../lib/api-response-builder";

export const oauthCallbackHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.info("Start OAuth callback handler");

    // 設定の初期化
    const config = Config.getInstance();
    const parameterFetcher = new AwsParameterFetcher();
    await config.init(parameterFetcher);

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
    return new ApiResponseBuilder().error("認証処理中にエラーが発生しました。");
  }
};
