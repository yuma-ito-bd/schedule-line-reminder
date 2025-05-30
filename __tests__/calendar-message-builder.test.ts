import { describe, it, expect } from "bun:test";
import { CalendarMessageBuilder } from "../src/calendar-message-builder";
import type { Event } from "../src/types/event";

describe("CalendarMessageBuilder", () => {
  describe("constructor", () => {
    it("インスタンスが作られること", () => {
      const events: Event[] = [
        {
          summary: "予定1",
          startDateTime: new Date("2021-01-01T00:00:00Z"),
          endDateTime: new Date("2021-01-01T01:00:00Z"),
          isAllDay: false,
        },
      ];
      const builder = new CalendarMessageBuilder(events);
      expect(builder).toBeDefined();
    });
  });

  describe("build", () => {
    it("1週間分の予定が記載されたメッセージが作成されること", () => {
      const today = new Date("2020-12-31");
      const events: Event[] = [
        {
          summary: "予定1",
          startDateTime: new Date("2021-01-01T00:00:00Z"),
          endDateTime: new Date("2021-01-01T01:00:00Z"),
          isAllDay: false,
        },
        {
          summary: "予定2",
          startDateTime: new Date("2021-01-02T00:00:00Z"),
          endDateTime: new Date("2021-01-02T01:00:00Z"),
          isAllDay: false,
        },
      ];
      const builder = new CalendarMessageBuilder(events, today);
      const message = builder.build();
      expect(message).toBe(
        `明日から1週間の予定です。
2021/01/01
09:00-10:00: 予定1

2021/01/02
09:00-10:00: 予定2

2021/01/03
予定なし

2021/01/04
予定なし

2021/01/05
予定なし

2021/01/06
予定なし

2021/01/07
予定なし`
      );
    });

    it("終日の予定が記載されたメッセージが作成されること", () => {
      const today = new Date("2020-12-31");
      const events: Event[] = [
        {
          summary: "予定1",
          startDateTime: new Date("2021-01-01"),
          endDateTime: new Date("2021-01-02"),
          isAllDay: true,
        },
      ];
      const builder = new CalendarMessageBuilder(events, today);
      const message = builder.build();
      expect(message).toBe(
        `明日から1週間の予定です。
2021/01/01
終日: 予定1

2021/01/02
予定なし

2021/01/03
予定なし

2021/01/04
予定なし

2021/01/05
予定なし

2021/01/06
予定なし

2021/01/07
予定なし`
      );
    });
  });
});
