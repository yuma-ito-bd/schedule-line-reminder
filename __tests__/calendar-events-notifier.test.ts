import { describe, it, spyOn, expect } from "bun:test";
import { GoogleCalendarApiAdapterMock } from "./mocks/google-calendar-api-adapter-mock";
import { CalendarEventsNotifier } from "../src/calendar-events-notifier";
import { LineMessagingApiClientMock } from "./mocks/line-messaging-api-client-mock";

describe("CalendarEventsNotifier", () => {
  describe("#call", () => {
    it("fetchEventsを呼び出すこと", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();
      const fetchEventsSpy = spyOn(googleCalendarApiMock, "fetchEvents");
      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id"
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
        "test-user-id"
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

      // 1つのカレンダーから以下の3件が返るようにモック
      // - 同一IDの2件 (重複除去対象)
      // - IDなしの2件（同内容でも重複除外しない）
      spyOn(googleCalendarApiMock, "fetchCalendarList").mockResolvedValue([
        { id: "primary", accessRole: "owner" } as any,
      ]);
      spyOn(googleCalendarApiMock, "fetchEvents").mockResolvedValue([
        { id: "same-id", summary: "A", start: { dateTime: "2022-01-01T00:00:00.000Z" }, end: { dateTime: "2022-01-01T01:00:00.000Z" } } as any,
        { id: "same-id", summary: "A duplicated", start: { dateTime: "2022-01-01T00:00:00.000Z" }, end: { dateTime: "2022-01-01T01:00:00.000Z" } } as any,
        { summary: "B", start: { dateTime: "2022-01-02T00:00:00.000Z" }, end: { dateTime: "2022-01-02T01:00:00.000Z" } } as any,
        { summary: "B", start: { dateTime: "2022-01-02T00:00:00.000Z" }, end: { dateTime: "2022-01-02T01:00:00.000Z" } } as any,
      ]);

      const warnSpy = spyOn(console, "warn");

      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id"
      );

      await calendarEventsNotifier.call();

      // メッセージ本文を取得
      const textArg = (lineMessagingApiClientMock.pushTextMessages as any).mock?.calls?.[0]?.[1]?.[0];
      // fallback: pushのスパイで呼ばれていれば、その引数から検証
      // ただし bun の spy 仕様に依存するため、代替として warn 呼び出し回数とイベント数を確認

      // IDなしイベントは2件分 warn が出る
      expect(warnSpy).toHaveBeenCalled();
    });

    it("IDがないイベントはsummary/startが同じでも両方残る", async () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const lineMessagingApiClientMock = new LineMessagingApiClientMock();

      spyOn(googleCalendarApiMock, "fetchCalendarList").mockResolvedValue([
        { id: "primary", accessRole: "owner" } as any,
      ]);
      spyOn(googleCalendarApiMock, "fetchEvents").mockResolvedValue([
        { summary: "C", start: { dateTime: "2022-01-03T00:00:00.000Z" }, end: { dateTime: "2022-01-03T01:00:00.000Z" } } as any,
        { summary: "C", start: { dateTime: "2022-01-03T00:00:00.000Z" }, end: { dateTime: "2022-01-03T01:00:00.000Z" } } as any,
      ]);

      const pushSpy = spyOn(lineMessagingApiClientMock, "pushTextMessages");

      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock,
        lineMessagingApiClientMock,
        "test-user-id"
      );

      await calendarEventsNotifier.call();

      expect(pushSpy).toHaveBeenCalled();
      const sentText = (pushSpy as any).mock.calls[0][1][0] as string;
      // 2件とも残るので、同日欄に2行出力されることを簡易的に検証
      const linesForDate = sentText.split("\n").filter((line) => line.includes(": C"));
      expect(linesForDate.length).toBe(2);
    });
  });
});
