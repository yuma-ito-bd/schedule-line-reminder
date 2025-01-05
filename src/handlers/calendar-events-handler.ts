import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";

export const calendarEventsHandler = async () => {
  const googleCalendarApi = new GoogleCalendarApiAdapter();
  new CalendarEventsNotifier(googleCalendarApi).call();
};

await calendarEventsHandler();
