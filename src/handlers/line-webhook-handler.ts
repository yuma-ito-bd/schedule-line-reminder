import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LineWebhookUseCase } from "../usecases/line-webhook-usecase";
import { LineMessagingApiClient } from "../line-messaging-api-client";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import { OAuthStateManager } from "../lib/oauth-state-manager";

/**
 * LINE Messaging APIのWebhookイベントを処理するLambda関数
 * @param event - API Gateway Lambda Proxy Input Format
 * @returns API Gateway Lambda Proxy Output Format
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.debug({ event });

    // Configの初期化（環境変数やパラメータストアから設定値を取得）
    const fetcher = new AwsParameterFetcher();
    console.debug({ fetcher });
    await Config.getInstance().init(fetcher);

    // リクエストボディの検証
    if (!event.body) {
      console.warn("Request body is empty");
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Request body is required",
        }),
      };
    }

    // LINE Messaging APIのイベントをパース
    let webhookEvent: LineWebhookEvent;
    try {
      const body = JSON.parse(event.body);
      webhookEvent = body.events?.[0];
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid request body format",
        }),
      };
    }

    // 依存関係の初期化
    const lineClient = new LineMessagingApiClient();
    const googleAuth = new GoogleAuthAdapter();
    const stateManager = new OAuthStateManager();
    const webhookUseCase = new LineWebhookUseCase(
      lineClient,
      googleAuth,
      stateManager
    );

    // Webhookイベントの処理
    const result = await webhookUseCase.handleWebhookEvent(webhookEvent);

    // レスポンスの生成
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: result.message,
      }),
    };
  } catch (error) {
    // エラーログの出力
    console.error("Unexpected error occurred:", error);

    // エラーレスポンスの生成
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
