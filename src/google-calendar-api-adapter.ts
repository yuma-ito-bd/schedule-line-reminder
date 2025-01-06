import { calendar, calendar_v3 } from "@googleapis/calendar";
import type {
  FetchEventsParams,
  Schema$GoogleCalendarApiAdapter,
} from "./types/google-calendar-api-adapter";
import { GoogleApiClient } from "./google-api-client";
import { Config } from "./lib/config";

export class GoogleCalendarApiAdapter
  implements Schema$GoogleCalendarApiAdapter
{
  private readonly calendarClient;

  constructor() {
    const config = Config.getInstance();
    const accessToken = config.GOOGLE_ACCESS_TOKEN;
    const refreshToken = config.GOOGLE_REFRESH_TOKEN;
    const googleApiClient = new GoogleApiClient({ accessToken, refreshToken });
    const authClient = googleApiClient.authClient;
    this.calendarClient = calendar({ version: "v3", auth: authClient });
  }

  async fetchEvents({
    calendarId,
    from,
    to,
  }: FetchEventsParams): Promise<calendar_v3.Schema$Event[]> {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      eventTypes: ["default"],
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    };
    const response = await this.calendarClient.events.list(params);

    return response.data.items || [];
  }
}
