import { DateFormatter } from "./lib/date-formatter";
import type { Event } from "./types/event";

type DateEventDescription = {
  [date: string]: string[];
};

export class CalendarMessageBuilder {
  private readonly SPAN_DAYS = 7;

  constructor(
    private readonly events: Event[],
    private readonly today = new Date()
  ) {}

  /**
   * カレンダーの予定を以下の形式でメッセージに変換する
   * ```
   * 明日から1週間の予定です。
   * 2021/01/01
   * 09:00-10:00: 予定1
   *
   * 2021/01/02
   * 09:00-10:00: 予定2
   * ```
   * @returns フォーマットされたメッセージ
   */
  build(): string {
    const headerText = this.headerText();
    const bodyText = this.buildBodyText();
    const messages = [headerText, bodyText];
    return messages.join("\n");
  }

  private buildBodyText() {
    // 日付ごとにイベントをまとめる
    const dateEventDescription = this.events.reduce<DateEventDescription>(
      (eventDetail, event) => {
        const dateKey = event.startDateTime
          ? DateFormatter.jstYmd(event.startDateTime)
          : "";
        const eventText = this.formatEvent(event);
        eventDetail[dateKey] = [...(eventDetail[dateKey] || []), eventText];
        return eventDetail;
      },
      {}
    );
    // 日付ごとのイベントをテキストに変換
    const dateKeys = this.buildDateKeys();
    const dateEventTexts = dateKeys.map((dateKey) => {
      const events = dateEventDescription[dateKey] ?? ["予定なし"];
      return [dateKey, ...events].join("\n");
    });
    const bodyText = dateEventTexts.join("\n\n"); // 日付の間は空行を入れる
    return bodyText;
  }

  /**
   * todayの翌日から1週間分の日付の文字列の配列を返却する
   * @returns 日付の文字列の配列 (todayが"2024-01-01"の場合、["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07", "2024-01-08"])
   */
  private buildDateKeys() {
    return [...Array(this.SPAN_DAYS)].map((_, i) => {
      const date = new Date(this.today);
      date.setDate(date.getDate() + (i + 1));
      return DateFormatter.jstYmd(date);
    });
  }

  private formatEvent(event: Event): string {
    const eventStartTime = event.startDateTime
      ? DateFormatter.jstHm(event.startDateTime)
      : "";
    const eventEndTime = event.endDateTime
      ? DateFormatter.jstHm(event.endDateTime)
      : "";

    return `${eventStartTime}-${eventEndTime}: ${event.summary}`;
  }

  private headerText(): string {
    return "明日から1週間の予定です。";
  }
}
