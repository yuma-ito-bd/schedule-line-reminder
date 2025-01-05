import type { Schema$GoogleCalendarApiAdapter } from "./types/google-calendar-api-adapter";

type Event = {
  summary: string;
  startDateTime: Date | null;
  endDateTime: Date | null;
};

export class CalendarEventsNotifier {
  constructor(
    private readonly googleCalendarApi: Schema$GoogleCalendarApiAdapter
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
    if (events.length === 0) {
      console.log("予定はありません");
      return;
    }

    events.forEach((event) => {
      console.log({
        title: event.summary,
        start: event.startDateTime?.toISOString(),
        end: event.endDateTime?.toISOString(),
      });
    });
  }
}
