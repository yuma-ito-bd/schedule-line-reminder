import type { Schema$GoogleCalendarApiAdapter } from "./types/google-calendar-api-adapter";
import type { Schema$LineMessagingApiClient } from "./types/line-messaging-api-adapter";
import type { Event } from "./types/event";
import { CalendarMessageBuilder } from "./calendar-message-builder";

export class CalendarEventsNotifier {
  constructor(
    private readonly googleCalendarApi: Schema$GoogleCalendarApiAdapter,
    private readonly lineMessagingApiClient: Schema$LineMessagingApiClient
  ) {}

  async call() {
    const events = await this.fetchEvents();
    this.notifyEvents(events);
  }

  private async fetchEvents(): Promise<Event[]> {
    const calendarId = "primary";

    // 翌日から1週間後までの予定を取得
    const from = new Date();
    from.setDate(from.getDate() + 1);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);

    const events = await this.googleCalendarApi.fetchEvents({
      calendarId,
      from,
      to,
    });

    const eventSummaries = events.map((event) => {
      const summary = event.summary || "タイトルなし";
      const startDateTime = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : null;
      const endDateTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : null;
      return { summary, startDateTime, endDateTime };
    });
    return eventSummaries;
  }

  private notifyEvents(events: Event[]) {
    const userId = "user-id";
    const message = new CalendarMessageBuilder(events).build();
    this.lineMessagingApiClient.pushTextMessages(userId, [message]);
  }
}
