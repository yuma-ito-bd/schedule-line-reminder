import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";

export const calendarEventsHandler = async () => {
  console.info("Start calendar events handler");
  const parameterFetcher = new AwsParameterFetcher();
  Config.getInstance().init(parameterFetcher);
  const googleCalendarApi = new GoogleCalendarApiAdapter();
  await new CalendarEventsNotifier(googleCalendarApi).call();
};
