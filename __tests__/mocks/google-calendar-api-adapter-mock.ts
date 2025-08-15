import type { Schema$GoogleCalendarApiAdapter } from "../../src/types/google-calendar-api-adapter";

export class GoogleCalendarApiAdapterMock
  implements Schema$GoogleCalendarApiAdapter
{
  async fetchEvents() {
    return [
      {
        summary: "Event 1",
        start: { dateTime: "2022-01-01T00:00:00.000Z" },
        end: { dateTime: "2022-01-01T01:00:00.000Z" },
      },
      {
        summary: "Event 2",
        start: { dateTime: "2022-01-02T00:00:00.000Z" },
        end: { dateTime: "2022-01-02T01:00:00.000Z" },
      },
    ];
  }

  async fetchCalendarList() {
    return [
      { id: "primary", accessRole: "owner" },
    ] as any;
  }
}
