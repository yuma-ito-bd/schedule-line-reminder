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
        lineMessagingApiClientMock
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
        lineMessagingApiClientMock
      );
      await calendarEventsNotifier.call();
      expect(pushTextMessagesSpy).toHaveBeenCalled();
    });
  });
});
