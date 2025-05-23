import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import { LineMessagingApiClient } from "../line-messaging-api-client";

export const calendarEventsHandler = async () => {
  console.info("Start calendar events handler");
  const parameterFetcher = new AwsParameterFetcher();
  await Config.getInstance().init(parameterFetcher);

  const auth = new GoogleAuthAdapter();
  const googleCalendarApi = new GoogleCalendarApiAdapter(auth);
  const lineMessagingApiClient = new LineMessagingApiClient();

  await new CalendarEventsNotifier(
    googleCalendarApi,
    lineMessagingApiClient
  ).call();
  console.info("End calendar events handler");
};
