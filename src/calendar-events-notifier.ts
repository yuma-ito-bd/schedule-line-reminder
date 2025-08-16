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
    // 購読中のカレンダー一覧を取得（失敗・未登録なら primary のみで続行）
    const calendars = await this.getTargetCalendars();

    // 翌日から1週間後までの予定を取得
    const { from, to } = this.buildSpan();

    // 複数カレンダーから並列取得、失敗は無視して他を継続
    const results = await Promise.allSettled(
      calendars.map((calendar) =>
        this.googleCalendarApi.fetchEvents({ calendarId: calendar.id, from, to })
      )
    );

    // 取得結果にカレンダー名を付与
    const annotated = results.flatMap((r, idx) => {
      if (r.status !== "fulfilled") return [] as { ev: Schema$CalendarEvent; calendarName?: string }[];
      const name = calendars[idx]?.name;
      return r.value.map((ev) => ({ ev, calendarName: name }));
    });

    // IDがあるイベントのみ重複除去。IDがないイベントは重複除去しない
    const withId = annotated.filter((a) => !!a.ev.id);
    const withoutId = annotated.filter((a) => !a.ev.id);

    withoutId.forEach((a) => {
      const startStr = a.ev.start?.dateTime || a.ev.start?.date || "unknown";
      console.warn(
        `Event missing id. summary=${a.ev.summary ?? ""}, start=${startStr}`
      );
    });

    const uniqueEventsMap = new Map<string, { ev: Schema$CalendarEvent; calendarName?: string }>();
    withId.forEach((a) => {
      const id = a.ev.id as string;
      if (!uniqueEventsMap.has(id)) {
        uniqueEventsMap.set(id, a);
      }
    });

    const dedupedAnnotated = [...uniqueEventsMap.values(), ...withoutId];

    // 表示用に変換（カレンダー名を保持）
    const eventSummaries = dedupedAnnotated
      .map((a) => {
        const summary = this.toEventSummary(a.ev);
        return { ...summary, calendarName: a.calendarName } satisfies Event;
      })
      .sort((a, b) => {
        const aTime = a.startDateTime?.getTime() ?? 0;
        const bTime = b.startDateTime?.getTime() ?? 0;
        return aTime - bTime;
      });

    return eventSummaries;
  }

  private async getTargetCalendars(): Promise<{ id: string; name?: string }[]> {
    try {
      const calendars = await this.userCalendarRepository.getUserCalendars(this.lineUserId);
      const list = calendars
        .map((c) => ({ id: c.calendarId, name: c.calendarName }))
        .filter((c) => !!c.id);
      return list.length > 0 ? list : [{ id: "primary", name: "メインカレンダー" }];
    } catch (e) {
      return [{ id: "primary", name: "メインカレンダー" }];
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
