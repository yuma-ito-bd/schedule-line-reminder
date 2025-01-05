import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";

export const calendarEventsHandler = async () => {
  console.info("Start calendar events handler");
  const googleCalendarApi = new GoogleCalendarApiAdapter();
  await new CalendarEventsNotifier(googleCalendarApi).call();
};
