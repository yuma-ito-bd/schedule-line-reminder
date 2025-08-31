import type { CommandHandler, CommandContext, CommandResult } from "../../types/command";
import type { Schema$LineMessagingApiClient } from "../../types/line-messaging-api-adapter";
import type { Schema$UserCalendarRepository } from "../../types/user-calendar-repository";
import { MessageTemplates } from "../messages";

/**
 * CalendarListCommand
 * - 名前/エイリアス: 「カレンダー一覧」/「カレンダー」
 * - 既存の一覧表示と等価な文言・フォーマットで返信する
 */
export class CalendarListCommand implements CommandHandler {
  readonly name: string = "カレンダー一覧";
  readonly aliases: string[] = ["カレンダー"];

  constructor(
    private readonly lineClient: Schema$LineMessagingApiClient,
    private readonly userCalendarRepository: Schema$UserCalendarRepository
  ) {}

  canHandle(input: string): boolean | Promise<boolean> {
    return /^(?:カレンダー一覧|カレンダー)$/.test(input.trim());
  }

  async handle(_input: string, context: CommandContext): Promise<CommandResult> {
    const userId = context.userId;
    const replyToken = context.replyToken ?? "";
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
      return { success: true, message: "カレンダー一覧を返信しました" };
    } catch (error) {
      context.logger?.error?.("Failed to reply calendar list", { userId, action: "calendar_list", error });
      return { success: false, message: MessageTemplates.calendarListFailure };
    }
  }
}

