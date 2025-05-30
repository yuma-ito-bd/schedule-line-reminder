import type {
  Schema$GoogleCalendarApiAdapter,
  Schema$CalendarEvent,
} from "./types/google-calendar-api-adapter";
import type { Schema$LineMessagingApiClient } from "./types/line-messaging-api-adapter";
import type { Event } from "./types/event";
import { CalendarMessageBuilder } from "./calendar-message-builder";

export class CalendarEventsNotifier {
  constructor(
    private readonly googleCalendarApi: Schema$GoogleCalendarApiAdapter,
    private readonly lineMessagingApiClient: Schema$LineMessagingApiClient,
    private readonly lineUserId: string
  ) {}

  async call() {
    const events = await this.fetchEvents();
    await this.notifyEvents(events);
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
    console.debug(events);

    const eventSummaries = events.map((event) => {
      const summary = event.summary || "タイトルなし";
      const isAllDay = this.isAllDay(event);
      const startDateTime = isAllDay
        ? this.convertToDate(event.start?.date)
        : this.convertToDate(event.start?.dateTime);
      const endDateTime = isAllDay
        ? this.convertToDate(event.end?.date)
        : this.convertToDate(event.end?.dateTime);
      return { summary, startDateTime, endDateTime, isAllDay };
    });
    return eventSummaries;
  }

  private notifyEvents(events: Event[]) {
    const message = new CalendarMessageBuilder(events).build();
    return this.lineMessagingApiClient.pushTextMessages(this.lineUserId, [
      message,
    ]);
  }

  private isAllDay(event: Schema$CalendarEvent): boolean {
    // 終日の予定は start.date のみ存在する
    return !event.start?.dateTime && !!event.start?.date;
  }

  private convertToDate(date: string | null | undefined): Date | null {
    if (!date) {
      return null;
    }
    return new Date(date);
  }
}
