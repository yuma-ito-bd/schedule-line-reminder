import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import { GoogleAuthUrlGenerator } from "../lib/google-auth-url-generator";
import type { Schema$ParameterFetcher } from "../types/lib/parameter-fetcher";

/**
 * LINE Messaging APIのWebhookイベントを処理するLambda関数
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.debug({ event });

    // Configの初期化（環境変数やパラメータストアから設定値を取得）
    const fetcher = new AwsParameterFetcher();
    console.debug({ fetcher });
    await Config.getInstance().init(fetcher);

    // LINE Messaging APIのイベントをパース
    const body = JSON.parse(event.body || "{}");
    const webhookEvent = body.events?.[0] as LineWebhookEvent;

    if (!webhookEvent) {
      return {
        statusCode: 200, // ヘルスチェックのため200で返却する
        body: JSON.stringify({
          message: "no event",
        }),
      };
    }

    // テキストメッセージの場合のみ処理
    if (
      webhookEvent.type === "message" &&
      webhookEvent.message.type === "text"
    ) {
      const text = webhookEvent.message.text;
      // 「カレンダー追加」というメッセージを受け取った場合、Google認可URLを生成
      if (text === "カレンダー追加") {
        const authUrlGenerator = new GoogleAuthUrlGenerator();
        const authUrl = authUrlGenerator.generateAuthUrl();
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "認可URLを生成しました",
            authUrl,
          }),
        };
      }
    }

    // その他のメッセージは無視
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "hello world",
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "some error happened",
      }),
    };
  }
};
