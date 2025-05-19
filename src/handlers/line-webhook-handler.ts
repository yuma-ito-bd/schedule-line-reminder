import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import type { LineWebhookEvent } from "../types/line-webhook-event";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.debug({ event });

    // Configの初期化
    const parameterFetcher = new AwsParameterFetcher();
    await Config.getInstance().init(parameterFetcher);

    // LINE Messaging APIのイベントをパース
    const body = JSON.parse(event.body || "{}");
    const webhookEvent = body.events?.[0] as LineWebhookEvent;

    if (!webhookEvent) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid webhook event",
        }),
      };
    }

    // テキストメッセージの場合のみ処理
    if (
      webhookEvent.type === "message" &&
      webhookEvent.message.type === "text"
    ) {
      const text = webhookEvent.message.text;
      if (text === "カレンダー追加") {
        // TODO: 実際のGoogleカレンダーの認可URLを生成する
        const authUrl = "https://example.com/auth";
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "認可URLを生成しました",
            authUrl,
          }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "hello world",
      }),
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "some error happened",
      }),
    };
  }
};
