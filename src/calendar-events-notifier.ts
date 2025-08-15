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
    // カレンダーリストを取得し、購読可能なカレンダーID一覧を得る
    // 取得に失敗した場合は primary のみで続行
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

    // 重複除去（event.id で重複判断）
    const uniqueEventsMap = new Map<string, Schema$CalendarEvent>();
    for (const ev of allEvents) {
      const id = ev.id || `${ev.summary}-${ev.start?.dateTime || ev.start?.date}`;
      if (id && !uniqueEventsMap.has(id)) {
        uniqueEventsMap.set(id, ev);
      }
    }

    const dedupedEvents = [...uniqueEventsMap.values()];

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
      const list = await this.googleCalendarApi.fetchCalendarList();
      // オーナーまたは閲覧可能なカレンダーを対象にする
      const allowed = list.filter((c) => c.accessRole === "owner" || c.accessRole === "reader" || c.accessRole === "writer");
      const ids = allowed.map((c) => c.id).filter((id): id is string => !!id);
      // fallback
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
