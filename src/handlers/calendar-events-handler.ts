import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { Config } from "../lib/config";

export const calendarEventsHandler = async () => {
  console.info("Start calendar events handler");
  Config.getInstance().init();
  const googleCalendarApi = new GoogleCalendarApiAdapter();
  await new CalendarEventsNotifier(googleCalendarApi).call();
};
