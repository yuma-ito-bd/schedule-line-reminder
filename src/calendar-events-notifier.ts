import type {
  Schema$GoogleCalendarApiAdapter,
  Schema$CalendarEvent,
} from "./types/google-calendar-api-adapter";
import type { Schema$LineMessagingApiClient } from "./types/line-messaging-api-adapter";
import type { Event } from "./types/event";
import { CalendarMessageBuilder } from "./calendar-message-builder";
import type { Schema$UserCalendarRepository } from "./types/user-calendar-repository";

export class CalendarEventsNotifier {
  constructor(
    private readonly googleCalendarApi: Schema$GoogleCalendarApiAdapter,
    private readonly lineMessagingApiClient: Schema$LineMessagingApiClient,
    private readonly lineUserId: string,
    private readonly userCalendarRepository: Schema$UserCalendarRepository
  ) {}

  async call() {
    const events = await this.fetchEvents();
    await this.notifyEvents(events);
  }

  private async fetchEvents(): Promise<Event[]> {
    // 購読中のカレンダーID一覧を得る（失敗・未登録なら primary のみで続行）
    const calendarIds = await this.getTargetCalendarIds();

    // 翌日から1週間後までの予定を取得
    const { from, to } = this.buildSpan();

    // 複数カレンダーから並列取得、失敗は無視して他を継続
    const results = await Promise.allSettled(
      calendarIds.map((calendarId) =>
        this.googleCalendarApi.fetchEvents({ calendarId, from, to })
      )
    );

    const allEvents = results
      .filter((r): r is PromiseFulfilledResult<Schema$CalendarEvent[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    // IDがあるイベントのみ重複除去。IDがないイベントは重複除去しない
    const eventsWithId = allEvents.filter((ev) => !!ev.id);
    const eventsWithoutId = allEvents.filter((ev) => !ev.id);

    eventsWithoutId.forEach((ev) => {
      const startStr = ev.start?.dateTime || ev.start?.date || "unknown";
      console.warn(
        `Event missing id. summary=${ev.summary ?? ""}, start=${startStr}`
      );
    });

    const uniqueEventsMap = new Map<string, Schema$CalendarEvent>();
    eventsWithId.forEach((ev) => {
      if (!uniqueEventsMap.has(ev.id!)) {
        uniqueEventsMap.set(ev.id!, ev);
      }
    });

    const dedupedEvents = [...uniqueEventsMap.values(), ...eventsWithoutId];

    // 表示用に変換
    const eventSummaries = dedupedEvents
      .map((event) => this.toEventSummary(event))
      .sort((a, b) => {
        const aTime = a.startDateTime?.getTime() ?? 0;
        const bTime = b.startDateTime?.getTime() ?? 0;
        return aTime - bTime;
      });

    return eventSummaries;
  }

  private async getTargetCalendarIds(): Promise<string[]> {
    try {
      const calendars = await this.userCalendarRepository.getUserCalendars(this.lineUserId);
      const ids = calendars.map((c) => c.calendarId).filter((id): id is string => !!id);
      return ids.length > 0 ? ids : ["primary"];
    } catch (e) {
      return ["primary"];
    }
  }

  private buildSpan(): { from: Date; to: Date } {
    const from = new Date();
    from.setDate(from.getDate() + 1);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private toEventSummary(event: Schema$CalendarEvent): Event {
    const summary = event.summary || "タイトルなし";
    const isAllDay = this.isAllDay(event);
    const startDateTime = isAllDay
      ? this.convertToDate(event.start?.date)
      : this.convertToDate(event.start?.dateTime);
    const endDateTime = isAllDay
      ? this.convertToDate(event.end?.date)
      : this.convertToDate(event.end?.dateTime);
    return { summary, startDateTime, endDateTime, isAllDay };
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
