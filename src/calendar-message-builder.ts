import { DateFormatter } from "./lib/date-formatter";
import type { Event } from "./types/event";

export class CalendarMessageBuilder {
  constructor(private readonly events: Event[]) {}

  /**
   * カレンダーの予定を以下の形式でメッセージに変換する
   * 明日から1週間の予定です。
   * 2021/01/01 09:00 - 10:00: 予定1
   * 2021/01/02 09:00 - 10:00: 予定2
   * @returns フォーマットされたメッセージ
   */
  build(): string {
    const eventDetails = this.events.map((event) => this.formatEvent(event));
    const messages = [...this.headerTexts(), ...eventDetails];
    return messages.join("\n");
  }

  private formatEvent(event: Event): string {
    const eventDate = event.startDateTime
      ? DateFormatter.jstYmd(event.startDateTime)
      : "";
    const eventStartTime = event.startDateTime
      ? DateFormatter.jstHm(event.startDateTime)
      : "";
    const eventEndTime = event.endDateTime
      ? DateFormatter.jstHm(event.endDateTime)
      : "";

    return `${eventDate} ${eventStartTime} - ${eventEndTime}: ${event.summary}`;
  }

  private headerTexts(): string[] {
    return ["明日から1週間の予定です。"];
  }
}
