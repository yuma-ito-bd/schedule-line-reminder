import { expect, test, describe } from "bun:test";
import type { messagingApi } from "@line/bot-sdk";
import { createCalendarQuickReplyItems, QUICK_REPLY_CALENDAR_LIMIT, type CalendarInfo } from "../../../src/usecases/helpers/quick-reply";
import { ADD_CALENDAR_SELECT, DELETE_CALENDAR_SELECT } from "../../../src/types/postback";

describe("quick-reply helpers", () => {
  test("label is truncated to 20 chars in quick reply items", () => {
    const longName = "あ".repeat(30);
    const calendars: CalendarInfo[] = [{ id: "c1", name: longName }];
    const items = createCalendarQuickReplyItems(calendars, ADD_CALENDAR_SELECT);
    const first = items[0] as messagingApi.QuickReplyItem;
    const action = first.action as messagingApi.PostbackAction;
    expect(action.type).toBe("postback");
    expect((action.label as string).length).toBe(20);
  });

  test("createCalendarQuickReplyItems caps items at limit and embeds data", () => {
    const calendars: CalendarInfo[] = Array.from({ length: 20 }).map((_, i) => ({ id: `id${i}`, name: `name${i}` }));
    const items = createCalendarQuickReplyItems(calendars, ADD_CALENDAR_SELECT);
    expect(items.length).toBe(QUICK_REPLY_CALENDAR_LIMIT);
    const first = items[0] as messagingApi.QuickReplyItem;
    const action = first.action as messagingApi.PostbackAction;
    expect(action.type).toBe("postback");
    const data = JSON.parse(action.data as string);
    expect(data.action).toBe(ADD_CALENDAR_SELECT);
    expect(data.calendarId).toBe("id0");
    expect(data.calendarName).toBe("name0");
  });

  test("createCalendarQuickReplyItems uses delete action", () => {
    const calendars: CalendarInfo[] = [{ id: "c1", name: "Calendar 1" }];
    const items = createCalendarQuickReplyItems(calendars, DELETE_CALENDAR_SELECT);
    const first = items[0] as messagingApi.QuickReplyItem;
    const action = first.action as messagingApi.PostbackAction;
    const data = JSON.parse(action.data as string);
    expect(data.action).toBe(DELETE_CALENDAR_SELECT);
  });
});
