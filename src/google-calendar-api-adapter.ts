import { calendar, calendar_v3 } from "@googleapis/calendar";
import type {
  FetchEventsParams,
  Schema$GoogleCalendarApiAdapter,
} from "./types/google-calendar-api-adapter";
import type { Schema$GoogleAuth } from "./types/google-auth";

export class GoogleCalendarApiAdapter
  implements Schema$GoogleCalendarApiAdapter
{
  private readonly calendarClient;

  constructor(auth: Schema$GoogleAuth) {
    this.calendarClient = calendar({
      version: "v3",
      auth: auth.getAuthClient(),
    });
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
