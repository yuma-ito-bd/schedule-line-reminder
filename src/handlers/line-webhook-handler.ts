import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { validateSignature } from "@line/bot-sdk";
import { LineWebhookUseCase } from "../usecases/line-webhook-usecase";
import { LineMessagingApiClient } from "../line-messaging-api-client";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import { Config } from "../lib/config";
import { OAuthStateRepository } from "../lib/oauth-state-repository";
import { TokenRepository } from "../lib/token-repository";
import { ApiResponseBuilder } from "../lib/api-response-builder";
import { UserCalendarRepository } from "../lib/user-calendar-repository";

/**
 * LINE Messaging APIのWebhookイベントを処理するLambda関数
 * @param event - API Gateway Lambda Proxy Input Format
 * @returns API Gateway Lambda Proxy Output Format
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const responseBuilder = new ApiResponseBuilder();
  try {
    console.debug({ event });

    // Configの初期化（環境変数やパラメータストアから設定値を取得）
    await Config.getInstance().init();

    // Signature validation
    const signature =
      event.headers["x-line-signature"] || event.headers["X-Line-Signature"]; // Header names can be case-insensitive
    if (!signature) {
      console.warn("x-line-signature header is missing");
      return responseBuilder.clientError("x-line-signature header is required");
    }

    const channelSecret = Config.getInstance().LINE_CHANNEL_SECRET;
    if (!event.body) {
      // event.body is used by validateSignature
      console.warn("Request body is empty, cannot validate signature");
      return responseBuilder.clientError(
        "Request body is required for signature validation"
      );
    }
    if (!validateSignature(event.body, channelSecret, signature)) {
      console.warn("Signature validation failed");
      return responseBuilder.clientError("Signature validation failed");
    }

    // LINE Messaging APIのイベントをパース
    let webhookEvent: LineWebhookEvent;
    try {
      const body = JSON.parse(event.body);
      webhookEvent = body.events?.[0];
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return responseBuilder.clientError("Invalid request body format");
    }

    // 依存関係の初期化
    const lineClient = new LineMessagingApiClient();
    const googleAuth = new GoogleAuthAdapter();
    const stateRepository = new OAuthStateRepository();
    const tokenRepository = new TokenRepository();
    const userCalendarRepository = new UserCalendarRepository();
    const webhookUseCase = new LineWebhookUseCase(
      lineClient,
      googleAuth,
      stateRepository,
      tokenRepository,
      userCalendarRepository
    );

    // Webhookイベントの処理
    const result = await webhookUseCase.handleWebhookEvent(webhookEvent);

    // レスポンスの生成
    return responseBuilder.success(result.message);
  } catch (error) {
    // エラーログの出力
    console.error("Unexpected error occurred:", error);

    // エラーレスポンスの生成
    return responseBuilder.serverError("Internal server error");
  }
};
