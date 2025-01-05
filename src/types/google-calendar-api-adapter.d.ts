import { calendar_v3 } from "@googleapis/calendar";

export type Schema$GoogleCalendarApiAdapter = {
  fetchEvents: (
    params: FetchEventsParams
  ) => Promise<calendar_v3.Schema$Event[]>;
};

export type FetchEventsParams = {
  calendarId: string;
  from: Date;
  to: Date;
};
