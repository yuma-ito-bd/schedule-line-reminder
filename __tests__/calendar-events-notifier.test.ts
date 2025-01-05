import { describe, it, spyOn, expect } from "bun:test";
import { GoogleCalendarApiAdapterMock } from "./mocks/google-calendar-api-adapter-mock";
import { CalendarEventsNotifier } from "../src/calendar-events-notifier";

describe("CalendarEventsNotifier", () => {
  describe("#call", () => {
    it("fetchEventsを呼び出すこと", () => {
      const googleCalendarApiMock = new GoogleCalendarApiAdapterMock();
      const fetchEventsSpy = spyOn(googleCalendarApiMock, "fetchEvents");
      const calendarEventsNotifier = new CalendarEventsNotifier(
        googleCalendarApiMock
      );
      calendarEventsNotifier.call();
      expect(fetchEventsSpy).toHaveBeenCalled();
    });
  });
});
