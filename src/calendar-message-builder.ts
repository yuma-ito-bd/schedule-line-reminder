import { DateFormatter } from "./lib/date-formatter";
import type { Event } from "./types/event";

type DateEventDescription = {
  [date: string]: string[];
};

export class CalendarMessageBuilder {
  constructor(private readonly events: Event[]) {}

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
        const date = event.startDateTime
          ? DateFormatter.jstYmd(event.startDateTime)
          : "";
        const eventText = this.formatEvent(event);
        eventDetail[date] = [...(eventDetail[date] || []), eventText];
        return eventDetail;
      },
      {}
    );
    // 日付ごとのイベントをテキストに変換
    const dateEventTexts = Object.entries(dateEventDescription).flatMap(
      ([date, events]) => [date, ...events].join("\n")
    );
    const bodyText = dateEventTexts.join("\n\n"); // 日付の間は空行を入れる
    return bodyText;
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
