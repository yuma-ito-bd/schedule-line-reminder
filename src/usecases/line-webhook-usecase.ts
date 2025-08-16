import type { Schema$LineMessagingApiClient } from "../types/line-messaging-api-adapter";
import type { Schema$GoogleAuth } from "../types/google-auth";
import type { WebhookUseCaseResult } from "../types/webhook-usecase-result";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import type { Schema$OAuthStateRepository } from "../types/oauth-state-repository";
import type { Schema$TokenRepository } from "../types/token-repository";
import type { Schema$UserCalendarRepository } from "../types/user-calendar-repository";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import type { Schema$GoogleCalendarApiAdapter } from "../types/google-calendar-api-adapter";
import type { messagingApi } from "@line/bot-sdk";

const QUICK_REPLY_CALENDAR_LIMIT = 12; // LINE API limit is 13; we use 12 to leave room if needed
const ADD_CALENDAR_SELECT = "ADD_CALENDAR_SELECT" as const;
const DELETE_CALENDAR_SELECT = "DELETE_CALENDAR_SELECT" as const;

type PostbackAction = typeof ADD_CALENDAR_SELECT | typeof DELETE_CALENDAR_SELECT;

const MessageTemplates = {
  tokenDeleteSuccess: "トークン情報を削除しました",
  tokenDeleteFailure: "トークン情報の削除に失敗しました",
  postbackAddReply: (calendarName: string) => `『${calendarName}』を購読カレンダーに追加しました。`,
  postbackAddResult: "カレンダー追加を完了しました",
  postbackDeleteReply: (name: string) => `『${name}』を購読カレンダーから削除しました。`,
  postbackDeleteResult: "カレンダー削除を完了しました",
  calendarListHeader: "購読中のカレンダー:",
  noSubscribedCalendars: "購読中のカレンダーはありません。『カレンダー追加』で登録できます。",
  sendAuthGuidance: "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください：",
  sendAuthUrlResult: "認可URLを送信しました",
  addQuickPrompt: "追加するカレンダーを選択してください",
  addQuickResult: "カレンダー追加クイックリプライを送信しました",
  deleteQuickPrompt: "削除するカレンダーを選択してください",
  deleteQuickResult: "カレンダー削除クイックリプライを送信しました",
  deleteNoTargetResult: "削除対象のカレンダーがありませんでした",
  noEvent: "no event",
  unsupportedMessage: "未対応のメッセージです",
  postbackError: "ポストバック処理でエラーが発生しました",
} as const;

// Narrowed event types derived from the discriminated union
type UnfollowEventType = Extract<LineWebhookEvent, { type: "unfollow" }>;
type PostbackEventType = Extract<LineWebhookEvent, { type: "postback" }>;
type MessageEventType = Extract<LineWebhookEvent, { type: "message" }>;

type ParsedPostbackData = {
  action: PostbackAction;
  calendarId?: string;
  calendarName?: string;
};

// Type-safe postback payloads
type AddCalendarPostback = {
  action: typeof ADD_CALENDAR_SELECT;
  calendarId: string;
  calendarName: string;
};

type DeleteCalendarPostback = {
  action: typeof DELETE_CALENDAR_SELECT;
  calendarId: string;
  calendarName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAddCalendarPostback(value: unknown): value is AddCalendarPostback {
  if (!isRecord(value)) return false;
  return (
    value["action"] === ADD_CALENDAR_SELECT &&
    typeof value["calendarId"] === "string" &&
    typeof value["calendarName"] === "string"
  );
}

function isDeleteCalendarPostback(value: unknown): value is DeleteCalendarPostback {
  if (!isRecord(value)) return false;
  return (
    value["action"] === DELETE_CALENDAR_SELECT &&
    typeof value["calendarId"] === "string"
  );
}

function isTextMessageEvent(event: LineWebhookEvent): event is MessageEventType & { message: { type: "text"; text: string } } {
  return (
    event?.type === "message" &&
    (event as MessageEventType).message?.type === "text"
  );
}

// Pure helpers for Quick Reply generation
function truncateLabel(label: string, maxLength = 20): string {
  if (!label) return "";
  return label.length <= maxLength ? label : label.slice(0, maxLength);
}

function createCalendarQuickReplyItems(
  calendars: Array<{ id: string; name: string }>,
  action: typeof ADD_CALENDAR_SELECT | typeof DELETE_CALENDAR_SELECT
): messagingApi.QuickReplyItem[] {
  return calendars
    .slice(0, QUICK_REPLY_CALENDAR_LIMIT)
    .map((cal) => {
      const label = truncateLabel(cal.name, 20);
      const data = JSON.stringify({
        action: action,
        calendarId: cal.id,
        calendarName: cal.name,
      });
      return {
        type: "action",
        action: {
          type: "postback",
          label,
          data,
        },
      } as messagingApi.QuickReplyItem;
    });
}

export class LineWebhookUseCase {
  constructor(
    private readonly lineClient: Schema$LineMessagingApiClient,
    private readonly googleAuth: Schema$GoogleAuth,
    private readonly stateRepository: Schema$OAuthStateRepository,
    private readonly tokenRepository: Schema$TokenRepository,
    private readonly userCalendarRepository: Schema$UserCalendarRepository,
    private readonly calendarApiFactory: (
      auth: Schema$GoogleAuth
    ) => Schema$GoogleCalendarApiAdapter = (auth) => new GoogleCalendarApiAdapter(auth)
  ) {}

  private async handleUnfollow(webhookEvent: UnfollowEventType): Promise<WebhookUseCaseResult> {
    try {
      await this.tokenRepository.deleteToken(webhookEvent.source.userId);
      return {
        success: true,
        message: MessageTemplates.tokenDeleteSuccess,
      };
    } catch (error) {
      console.error("Failed to delete token:", error);
      return {
        success: false,
        message: MessageTemplates.tokenDeleteFailure,
      };
    }
  }

  private async handlePostback(webhookEvent: PostbackEventType): Promise<WebhookUseCaseResult | null> {
    try {
      const userId = webhookEvent.source.userId;
      const data = webhookEvent.postback.data;
      const parsedUnknown = JSON.parse(data) as unknown;

      if (isAddCalendarPostback(parsedUnknown)) {
        await this.userCalendarRepository.addCalendar({
          userId,
          calendarId: parsedUnknown.calendarId,
          calendarName: parsedUnknown.calendarName,
        });
        await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
          MessageTemplates.postbackAddReply(parsedUnknown.calendarName),
        ]);
        return { success: true, message: MessageTemplates.postbackAddResult };
      }

      if (isDeleteCalendarPostback(parsedUnknown)) {
        await this.userCalendarRepository.deleteCalendar(userId, parsedUnknown.calendarId);
        const name = parsedUnknown.calendarName || parsedUnknown.calendarId;
        await this.lineClient.replyTextMessages(webhookEvent.replyToken, [
          MessageTemplates.postbackDeleteReply(name),
        ]);
        return { success: true, message: MessageTemplates.postbackDeleteResult };
      }

      return null;
    } catch (error) {
      console.error("Failed to handle postback:", error);
      return { success: false, message: MessageTemplates.postbackError };
    }
  }

  private async handleCalendarList(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    const calendars = await this.userCalendarRepository.getUserCalendars(userId);
    if (calendars.length > 0) {
      const lines = calendars.map((c) => `- ${c.calendarName} (${c.calendarId})`);
      const message = [MessageTemplates.calendarListHeader, ...lines].join("\n");
      await this.lineClient.replyTextMessages(replyToken, [message]);
    } else {
      await this.lineClient.replyTextMessages(replyToken, [
        MessageTemplates.noSubscribedCalendars,
      ]);
    }
    return {
      success: true,
      message: "カレンダー一覧を返信しました",
    };
  }

  private async handleCalendarAdd(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    const token = await this.tokenRepository.getToken(userId);
    if (!token) {
      const { url, state } = this.googleAuth.generateAuthUrl();
      await this.stateRepository.saveState(state, userId);
      await this.lineClient.replyTextMessages(replyToken, [
        MessageTemplates.sendAuthGuidance,
        url,
      ]);
      return {
        success: true,
        message: MessageTemplates.sendAuthUrlResult,
      };
    }

    // トークンが登録済みの場合は、利用可能なカレンダーを取得してクイックリプライで提示
    this.googleAuth.setTokens(token);
    const calendarApi = this.calendarApiFactory(this.googleAuth);
    const list = await calendarApi.fetchCalendarList();
    const calendarsForQuick = list
      .filter((entry) => !!entry.id)
      .map((entry) => ({
        id: entry.id as string,
        name: entry.summary || (entry.id as string) || "(no title)",
      }));
    const items = createCalendarQuickReplyItems(
      calendarsForQuick,
      ADD_CALENDAR_SELECT
    );
    await this.lineClient.replyTextWithQuickReply(
      replyToken,
      MessageTemplates.addQuickPrompt,
      items
    );

    return { success: true, message: MessageTemplates.addQuickResult };
  }

  private async handleCalendarDelete(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    const calendars = await this.userCalendarRepository.getUserCalendars(userId);
    if (calendars.length === 0) {
      await this.lineClient.replyTextMessages(replyToken, [
        MessageTemplates.noSubscribedCalendars,
      ]);
      return { success: true, message: MessageTemplates.deleteNoTargetResult };
    }
    const calendarsForQuick = calendars.map((entry) => ({
      id: entry.calendarId,
      name: entry.calendarName || entry.calendarId,
    }));
    const items = createCalendarQuickReplyItems(
      calendarsForQuick,
      DELETE_CALENDAR_SELECT
    );
    await this.lineClient.replyTextWithQuickReply(
      replyToken,
      MessageTemplates.deleteQuickPrompt,
      items
    );
    return { success: true, message: MessageTemplates.deleteQuickResult };
  }

  private async handleMessage(webhookEvent: MessageEventType): Promise<WebhookUseCaseResult | null> {
    if (webhookEvent.message.type !== "text") return null;
    const text = webhookEvent.message.text;

    if (/^(?:カレンダー一覧|カレンダー)$/.test(text)) {
      return this.handleCalendarList(webhookEvent.source.userId, webhookEvent.replyToken);
    }
    if (text === "カレンダー追加") {
      return this.handleCalendarAdd(webhookEvent.source.userId, webhookEvent.replyToken);
    }
    if (text === "カレンダー削除") {
      return this.handleCalendarDelete(webhookEvent.source.userId, webhookEvent.replyToken);
    }

    return null;
  }

  async handleWebhookEvent(
    webhookEvent: LineWebhookEvent
  ): Promise<WebhookUseCaseResult> {
    if (!webhookEvent) {
      return {
        success: true,
        message: MessageTemplates.noEvent,
      };
    }

    if (webhookEvent.type === "unfollow") {
      return this.handleUnfollow(webhookEvent);
    }

    if (webhookEvent.type === "postback") {
      const postbackResult = await this.handlePostback(webhookEvent);
      if (postbackResult) return postbackResult;
    }

    if (isTextMessageEvent(webhookEvent)) {
      const messageResult = await this.handleMessage(webhookEvent);
      if (messageResult) return messageResult;
    }

    return {
      success: true,
      message: MessageTemplates.unsupportedMessage,
    };
  }
}
