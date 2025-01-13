import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { Config } from "../lib/config";
import { ParameterFetcher } from "../lib/parameter-fetcher";

export const calendarEventsHandler = async () => {
  console.info("Start calendar events handler");
  const parameterFetcher = new ParameterFetcher();
  Config.getInstance().init(parameterFetcher);
  const googleCalendarApi = new GoogleCalendarApiAdapter();
  await new CalendarEventsNotifier(googleCalendarApi).call();
};
