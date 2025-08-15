import { calendar_v3 } from "@googleapis/calendar";

export type Schema$CalendarEvent = calendar_v3.Schema$Event;
export type Schema$CalendarListEntry = calendar_v3.Schema$CalendarListEntry;

export type Schema$GoogleCalendarApiAdapter = {
	fetchEvents: (params: FetchEventsParams) => Promise<Schema$CalendarEvent[]>;
	fetchCalendarList: () => Promise<Schema$CalendarListEntry[]>;
};

export type FetchEventsParams = {
	calendarId: string;
	from: Date;
	to: Date;
};
