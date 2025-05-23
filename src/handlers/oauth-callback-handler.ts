import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";

export const oauthCallbackHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.info("Start OAuth callback handler");

    // クエリパラメータから認可コードを取得
    const code = event.queryStringParameters?.code;
    if (!code) {
      throw new Error("Authorization code is missing");
    }

    // 設定の初期化
    const config = Config.getInstance();
    const parameterFetcher = new AwsParameterFetcher();
    await config.init(parameterFetcher);

    // Google認証の処理
    const auth = new GoogleAuthAdapter();
    const tokens = await auth.getTokensFromCode(code);

    // トークンの保存処理をここに実装
    // TODO: トークンを安全な場所（例：AWS Systems Manager Parameter Store）に保存

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
