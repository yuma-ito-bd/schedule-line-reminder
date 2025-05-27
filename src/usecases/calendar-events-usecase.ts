import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { LineMessagingApiClient } from "../line-messaging-api-client";
import { Config } from "../lib/config";

export class CalendarEventsUseCase {
  async execute(): Promise<void> {
    const config = Config.getInstance();
    const auth = new GoogleAuthAdapter();
    const token = {
      accessToken: config.GOOGLE_ACCESS_TOKEN,
      refreshToken: config.GOOGLE_REFRESH_TOKEN,
    };
    auth.setTokens(token);
    const googleCalendarApi = new GoogleCalendarApiAdapter(auth);
    const lineMessagingApiClient = new LineMessagingApiClient();

    await new CalendarEventsNotifier(
      googleCalendarApi,
      lineMessagingApiClient
    ).call();
  }
}
