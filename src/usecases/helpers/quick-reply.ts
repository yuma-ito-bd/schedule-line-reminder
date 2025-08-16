import type { messagingApi } from "@line/bot-sdk";
import { ADD_CALENDAR_SELECT, DELETE_CALENDAR_SELECT } from "../../types/postback";

export const QUICK_REPLY_CALENDAR_LIMIT = 12; // LINE API limit is 13; we use 12 to leave room if needed

export function truncateLabel(label: string, maxLength = 20): string {
  if (!label) return "";
  return label.length <= maxLength ? label : label.slice(0, maxLength);
}

export function createCalendarQuickReplyItems(
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