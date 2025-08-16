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
  });
});
