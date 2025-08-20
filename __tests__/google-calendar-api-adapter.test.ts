import { describe, it, expect, spyOn } from "bun:test";
import { GoogleCalendarApiAdapter } from "../src/google-calendar-api-adapter";
import type { Schema$GoogleAuth } from "../src/types/google-auth";

class DummyAuth implements Schema$GoogleAuth {
  getAuthClient() {
    return {} as any;
  }
  setTokens() {}
  setTokensUpdatedListener() {}
}

describe("GoogleCalendarApiAdapter", () => {
  it("fetchEvents: Google API の events.list を正しいパラメータで呼び出し、items を返す", async () => {
    const adapter = new GoogleCalendarApiAdapter(new DummyAuth());

    const captured: any[] = [];
    const events = {
      list: async (params: any) => {
        captured.push(params);
        return {
          data: {
            items: [
              { id: "e1", summary: "S", start: { dateTime: "2024-01-01T00:00:00.000Z" }, end: { dateTime: "2024-01-01T01:00:00.000Z" } },
            ],
          },
        } as any;
      },
    };
    const calendarList = { list: async () => ({ data: { items: [] } }) } as any;
    (adapter as any).calendarClient = { events, calendarList };
    const spy = spyOn(events, "list");

    const from = new Date("2024-01-02T00:00:00.000Z");
    const to = new Date("2024-01-08T23:59:59.999Z");
    const items = await adapter.fetchEvents({ calendarId: "primary", from, to });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(items.length).toBe(1);
    expect(captured[0].calendarId).toBe("primary");
    expect(captured[0].timeMin).toBe(from.toISOString());
    expect(captured[0].timeMax).toBe(to.toISOString());
    expect(captured[0].singleEvents).toBe(true);
    expect(captured[0].orderBy).toBe("startTime");
    expect(Array.isArray(captured[0].eventTypes)).toBe(true);
  });

  it("fetchEvents: items が未定義の場合は空配列を返す", async () => {
    const adapter = new GoogleCalendarApiAdapter(new DummyAuth());
    const events = {
      list: async () => ({ data: {} }) as any,
    };
    const calendarList = { list: async () => ({ data: {} }) } as any;
    (adapter as any).calendarClient = { events, calendarList };

    const from = new Date("2024-01-02T00:00:00.000Z");
    const to = new Date("2024-01-08T23:59:59.999Z");
    const items = await adapter.fetchEvents({ calendarId: "primary", from, to });
    expect(items).toEqual([]);
  });

  it("fetchCalendarList: calendarList.list を呼び出し、items を返す（未定義なら空配列）", async () => {
    const adapter = new GoogleCalendarApiAdapter(new DummyAuth());

    // 正常に items あり
    (adapter as any).calendarClient = {
      events: { list: async () => ({ data: {} }) },
      calendarList: { list: async () => ({ data: { items: [{ id: "c1" }] } }) },
    } as any;
    const list1 = await adapter.fetchCalendarList();
    expect(list1).toEqual([{ id: "c1" }]);

    // items 未定義
    (adapter as any).calendarClient = {
      events: { list: async () => ({ data: {} }) },
      calendarList: { list: async () => ({ data: {} }) },
    } as any;
    const list2 = await adapter.fetchCalendarList();
    expect(list2).toEqual([]);
  });
});

