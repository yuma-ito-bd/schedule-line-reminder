import { calendar_v3 } from "@googleapis/calendar";

export type CalendarListEntry = {
  id?: string;
  summary?: string;
};

export type CalendarEventEntry = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
};

export type Schema$GoogleCalendarApiAdapter = {
  fetchCalendarList(): Promise<CalendarListEntry[]>;
  fetchEvents(calendarId: string): Promise<CalendarEventEntry[]>;
};
