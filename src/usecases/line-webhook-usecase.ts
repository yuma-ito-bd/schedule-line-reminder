import type { Schema$LineMessagingApiClient } from "../types/line-messaging-api-adapter";
import type { Schema$GoogleAuth } from "../types/google-auth";
import type { WebhookUseCaseResult } from "../types/webhook-usecase-result";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import type { Schema$OAuthStateRepository } from "../types/oauth-state-repository";
import type { Schema$TokenRepository } from "../types/token-repository";
import type { Schema$UserCalendarRepository } from "../types/user-calendar-repository";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import type { messagingApi } from "@line/bot-sdk";

const QUICK_REPLY_CALENDAR_LIMIT = 12; // LINE API limit is 13; we use 12 to leave room if needed

function truncateLabel(label: string, maxLength = 20): string {
  if (!label) return "";
  return label.length <= maxLength ? label : label.slice(0, maxLength);
}

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

    if (webhookEvent.type === "postback") {
      try {
        const userId = webhookEvent.source.userId;
        const data = webhookEvent.postback.data;
        const parsed = JSON.parse(data) as { action: string; calendarId?: string; calendarName?: string };
        if (parsed.action === "ADD_CALENDAR_SELECT" && parsed.calendarId && parsed.calendarName) {
          await this.userCalendarRepository.addCalendar({
            userId,
            calendarId: parsed.calendarId,
            calendarName: parsed.calendarName,
          });
          await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
            `『${parsed.calendarName}』を購読カレンダーに追加しました。`,
          ]);
          return { success: true, message: "カレンダー追加を完了しました" };
        }
      } catch (error) {
        console.error("Failed to handle postback:", error);
        return { success: false, message: "ポストバック処理でエラーが発生しました" };
      }
    }

    if (
      webhookEvent.type === "message" &&
      webhookEvent.message.type === "text"
    ) {
      const text = webhookEvent.message.text;
      if (/^(?:カレンダー一覧|カレンダー)$/.test(text)) {
        const userId = webhookEvent.source.userId;
        const calendars = await this.userCalendarRepository.getUserCalendars(userId);
        if (calendars.length > 0) {
          const lines = calendars.map((c) => `- ${c.calendarName} (${c.calendarId})`);
          const message = ["購読中のカレンダー:", ...lines].join("\n");
          await this.lineClient.replyTextMessages(webhookEvent.replyToken, [message]);
        } else {
          await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
            "購読中のカレンダーはありません。『カレンダー追加』で登録できます。",
          ]);
        }

        return {
          success: true,
          message: "カレンダー一覧を返信しました",
        };
      }
      if (text === "カレンダー追加") {
        const userId = webhookEvent.source.userId;
        const token = await this.tokenRepository.getToken(userId);
        if (!token) {
          const { url, state } = this.googleAuth.generateAuthUrl();
          await this.stateRepository.saveState(state, userId);
          await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
            "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください：",
            url,
          ]);

          return {
            success: true,
            message: "認可URLを送信しました",
          };
        }

        // トークンが登録済みの場合は、利用可能なカレンダーを取得してクイックリプライで提示
        this.googleAuth.setTokens(token);
        const calendarApi = new GoogleCalendarApiAdapter(this.googleAuth);
        const list = await calendarApi.fetchCalendarList();
        const items = list.slice(0, QUICK_REPLY_CALENDAR_LIMIT).map((entry) => {
          const rawLabel = entry.summary || entry.id || "(no title)";
          const label = truncateLabel(rawLabel, 20);
          const data = JSON.stringify({
            action: "ADD_CALENDAR_SELECT",
            calendarId: entry.id,
            calendarName: rawLabel,
          });
          return {
            type: "action",
            action: {
              type: "postback",
              label,
              data,
            },
          };
        });
        await this.lineClient.replyTextWithQuickReply(
          webhookEvent.replyToken,
          "追加するカレンダーを選択してください",
          items as messagingApi.QuickReplyItem[]
        );

        return { success: true, message: "カレンダー追加クイックリプライを送信しました" };
      }
    }

    return {
      success: true,
      message: "未対応のメッセージです",
    };
  }
}
