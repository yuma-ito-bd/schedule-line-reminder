import type { Schema$LineMessagingApiClient } from "../types/line-messaging-api-adapter";
import type { Schema$GoogleAuth } from "../types/google-auth";
import type { WebhookUseCaseResult } from "../types/webhook-usecase-result";
import type { LineWebhookEvent } from "../types/line-webhook-event";
import type { Schema$OAuthStateRepository } from "../types/oauth-state-repository";
import type { Schema$TokenRepository } from "../types/token-repository";
import type { Schema$UserCalendarRepository } from "../types/user-calendar-repository";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import type { Schema$GoogleCalendarApiAdapter } from "../types/google-calendar-api-adapter";
import { ADD_CALENDAR_SELECT, DELETE_CALENDAR_SELECT, isAddCalendarPostback, isDeleteCalendarPostback } from "../types/postback";
import { createCalendarQuickReplyItems } from "./helpers/quick-reply";
import { MessageTemplates } from "./messages";


// Narrowed event types derived from the discriminated union
type UnfollowEventType = Extract<LineWebhookEvent, { type: "unfollow" }>;
type PostbackEventType = Extract<LineWebhookEvent, { type: "postback" }>;
type MessageEventType = Extract<LineWebhookEvent, { type: "message" }>;



function isTextMessageEvent(event: LineWebhookEvent): event is MessageEventType & { message: { type: "text"; text: string } } {
  return (
    event?.type === "message" &&
    (event as MessageEventType).message?.type === "text"
  );
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
      console.error("Failed to delete token", {
        userId: webhookEvent.source.userId,
        action: "unfollow",
        error,
      });
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
      console.error("Failed to handle postback", {
        userId: webhookEvent.source.userId,
        action: "postback",
        rawData: webhookEvent.postback.data,
        error,
      });
      return { success: false, message: MessageTemplates.postbackError };
    }
  }

  private async handleCalendarList(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    try {
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
    } catch (error) {
      console.error("Failed to reply calendar list", {
        userId,
        action: "calendar_list",
        error,
      });
      return {
        success: false,
        message: MessageTemplates.calendarListFailure,
      };
    }
  }

  private async handleCalendarAdd(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    // Step 1: fetch token
    let token;
    try {
      token = await this.tokenRepository.getToken(userId);
    } catch (error) {
      console.error("Failed to fetch token", {
        userId,
        action: "calendar_add_get_token",
        error,
      });
      return { success: false, message: MessageTemplates.tokenFetchFailure };
    }

    // Step 2: if token is missing, send auth guidance and URL
    if (!token) {
      try {
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
      } catch (error) {
        console.error("Failed to send auth URL", {
          userId,
          action: "calendar_add_auth",
          error,
        });
        return { success: false, message: MessageTemplates.authUrlSendFailure };
      }
    }

    // Step 3: token exists → fetch calendar list and send quick reply
    try {
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
    } catch (error) {
      console.error("Failed to send add-calendar quick reply", {
        userId,
        action: "calendar_add_quick_reply",
        error,
      });
      return { success: false, message: MessageTemplates.addQuickFailure };
    }
  }

  private async handleCalendarDelete(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    try {
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
    } catch (error) {
      console.error("Failed to send delete-calendar quick reply", {
        userId,
        action: "calendar_delete_quick_reply",
        error,
      });
      return { success: false, message: MessageTemplates.deleteQuickFailure };
    }
  }

  private async handleHelp(userId: string, replyToken: string): Promise<WebhookUseCaseResult> {
    try {
      await this.lineClient.replyTextMessages(replyToken, [MessageTemplates.helpText]);
      return { success: true, message: MessageTemplates.helpResult };
    } catch (error) {
      console.error("Failed to send help message", {
        userId,
        action: "help",
        error,
      });
      return { success: false, message: MessageTemplates.helpSendFailure };
    }
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
    if (/^(?:ヘルプ|help)$/i.test(text)) {
      return this.handleHelp(webhookEvent.source.userId, webhookEvent.replyToken);
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
