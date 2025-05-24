import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import { OAuthStateManager } from "../lib/oauth-state-manager";

export const oauthCallbackHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.info("Start OAuth callback handler");

    // クエリパラメータから認可コードとstateを取得
    const code = event.queryStringParameters?.code;
    const state = event.queryStringParameters?.state;

    if (!code) {
      throw new Error("Authorization code is missing");
    }
    if (!state) {
      throw new Error("State parameter is missing");
    }

    // stateパラメータの検証
    const stateManager = new OAuthStateManager();
    const { isValid, userId } = await stateManager.validateState(state);
    if (!isValid || !userId) {
      throw new Error("Invalid state parameter");
    }

    // 設定の初期化
    const config = Config.getInstance();
    const parameterFetcher = new AwsParameterFetcher();
    await config.init(parameterFetcher);

    // Google認証の処理
    const auth = new GoogleAuthAdapter();
    const tokens = await auth.getTokensFromCode(code);

    // トークンの保存
    // const tokenManager = new OAuthTokenManager(
    //   `${process.env.STACK_NAME}-oauth-tokens`
    // );
    // await tokenManager.saveToken(userId, tokens);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "認証が完了しました。このウィンドウを閉じてください。",
      }),
    };
  } catch (error) {
    console.error("Error in OAuth callback handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "認証処理中にエラーが発生しました。",
      }),
    };
  }
};
