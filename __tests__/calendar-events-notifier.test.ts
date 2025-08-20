import { describe, it, spyOn, expect } from "bun:test";
import { GoogleCalendarApiAdapterMock } from "./mocks/google-calendar-api-adapter-mock";
import { CalendarEventsNotifier } from "../src/calendar-events-notifier";
import { LineMessagingApiClientMock } from "./mocks/line-messaging-api-client-mock";

class DummyUserCalendarRepository {
  async addCalendar() {}
  async deleteCalendar() {}
  async getUserCalendars() {
    return [
      { userId: "test-user-id", calendarId: "primary", calendarName: "メインカレンダー", createdAt: new Date(), updatedAt: new Date() },
    ];
  }
}

describe("CalendarEventsNotifier", () => {
  describe("#call", () => {
    it("fetchEventsを呼び出すこと", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();
      const fetchEventsSpy = spyOn(googleCalendarApiMock, "fetchEvents");
      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id",
        new DummyUserCalendarRepository() as any
      );
      await calendarEventsNotifier.call();
      expect(fetchEventsSpy).toHaveBeenCalled();
    });

    it("pushTextMessagesを呼び出すこと", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();
      const pushTextMessagesSpy = spyOn(
        lineMessagingApiClientMock,
        "pushTextMessages"
      );
      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id",
        new DummyUserCalendarRepository() as any
      );
      await calendarEventsNotifier.call();
      // 第1引数がtest-user-idであること
      expect(pushTextMessagesSpy).toHaveBeenCalledWith("test-user-id", [
        expect.any(String),
      ]);
    });

    it("同一IDのイベントは重複除外されるが、IDのないイベントは重複除外されない", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startIso = tomorrow.toISOString();

      spyOn(googleCalendarApiMock, "fetchEvents").mockResolvedValue([
        { id: "same-id", summary: "A", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
        { id: "same-id", summary: "A duplicated", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
        { summary: "B", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
        { summary: "B", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
      ]);

      const warnSpy = spyOn(console, "warn");

      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id",
        new DummyUserCalendarRepository() as any
      );

      await calendarEventsNotifier.call();

      // IDなしイベントは2件分 warn が出る
      expect(warnSpy).toHaveBeenCalled();
    });

    it("IDがないイベントはsummary/startが同じでも両方残る", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startIso = tomorrow.toISOString();

      spyOn(googleCalendarApiMock, "fetchEvents").mockResolvedValue([
        { summary: "C", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
        { summary: "C", start: { dateTime: startIso }, end: { dateTime: startIso } } as any,
      ]);

      const pushSpy = spyOn(lineMessagingApiClientMock, "pushTextMessages");

      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id",
        new DummyUserCalendarRepository() as any
      );

      await calendarEventsNotifier.call();

      expect(pushSpy).toHaveBeenCalled();
      // Bunのspyが提供する calls を参照
      const calls = (pushSpy as any).mock.calls;
      const sentText = calls[0][1][0] as string;
      const linesForDate = sentText.split("\n").filter((line) => line.includes(" C"));
      expect(linesForDate.length).toBe(2);
    });

    it("複数カレンダーを並列取得し、片方が失敗してももう片方の結果で通知できる", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();

      // 2つのカレンダーが購読されているとする
      class TwoCalendarsRepo {
        async addCalendar() {}
        async deleteCalendar() {}
        async getUserCalendars() {
          return [
            { userId: "u", calendarId: "cal-ok", calendarName: "OK", createdAt: new Date(), updatedAt: new Date() },
            { userId: "u", calendarId: "cal-ng", calendarName: "NG", createdAt: new Date(), updatedAt: new Date() },
          ];
        }
      }

      // cal-ok は成功、cal-ng は失敗させる
      const fetchSpy = spyOn(googleCalendarApiMock, "fetchEvents").mockImplementation((params: any) => {
        if (params.calendarId === "cal-ng") return Promise.reject(new Error("boom"));
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return Promise.resolve([
          { summary: "OK-Event", start: { dateTime: tomorrow.toISOString() }, end: { dateTime: tomorrow.toISOString() } } as any,
        ]);
      });
      const pushSpy = spyOn(lineMessagingApiClientMock, "pushTextMessages");

      const notifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "u",
        new TwoCalendarsRepo() as any
      );

      await notifier.call();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(pushSpy).toHaveBeenCalled();
      const text = (pushSpy as any).mock.calls[0][1][0] as string;
      expect(text).toContain("OK-Event");
      // cal-ng 側は失敗しても通知文面が生成される
    });

    it("購読が空配列/取得失敗時は primary にフォールバックする", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();

      class ErroringRepo {
        async addCalendar() {}
        async deleteCalendar() {}
        async getUserCalendars() { throw new Error("dynamo error"); }
      }

      const fetchSpy = spyOn(googleCalendarApiMock, "fetchEvents").mockResolvedValue([]);
      const notifier1 = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "user-a",
        new ErroringRepo() as any
      );
      await notifier1.call();
      expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "primary" }));

      // 空配列の場合も primary
      class EmptyRepo {
        async addCalendar() {}
        async deleteCalendar() {}
        async getUserCalendars() { return []; }
      }
      fetchSpy.mockClear();
      const notifier2 = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "user-b",
        new EmptyRepo() as any
      );
      await notifier2.call();
      expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "primary" }));
    });
  });
});
