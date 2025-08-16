import type { Schema$LineMessagingApiClient } from "../types/line-messaging-api-adapter";
import type { Schema$GoogleAuth } from "../types/google-auth";
import type { WebhookUseCaseResult } from "../types/webhook-usecase-result";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import type { Schema$OAuthStateRepository } from "../types/oauth-state-repository";
import type { Schema$TokenRepository } from "../types/token-repository";
import type { Schema$UserCalendarRepository } from "../types/user-calendar-repository";

export class LineWebhookUseCase {
  constructor(
    private readonly lineClient: Schema$LineMessagingApiClient,
    private readonly googleAuth: Schema$GoogleAuth,
    private readonly stateRepository: Schema$OAuthStateRepository,
    private readonly tokenRepository: Schema$TokenRepository,
    private readonly userCalendarRepository: Schema$UserCalendarRepository
  ) {}

  async handleWebhookEvent(
    webhookEvent: LineWebhookEvent
  ): Promise<WebhookUseCaseResult> {
    if (!webhookEvent) {
      return {
        success: true,
        message: "no event",
      };
    }

    if (webhookEvent.type === "unfollow") {
      try {
        await this.tokenRepository.deleteToken(webhookEvent.source.userId);
        return {
          success: true,
          message: "トークン情報を削除しました",
        };
      } catch (error) {
        console.error("Failed to delete token:", error);
        return {
          success: false,
          message: "トークン情報の削除に失敗しました",
        };
      }
    }

    if (
      webhookEvent.type === "message" &&
      webhookEvent.message.type === "text"
    ) {
      const text = webhookEvent.message.text;
      if (text === "カレンダー追加") {
        const { url, state } = this.googleAuth.generateAuthUrl();
        await this.stateRepository.saveState(state, webhookEvent.source.userId);
        await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
          "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください：",
          url,
        ]);

        return {
          success: true,
          message: "認可URLを送信しました",
        };
      }
    }

    return {
      success: true,
      message: "未対応のメッセージです",
    };
  }
}
