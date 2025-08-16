export type Event = {
  summary: string;
  startDateTime: Date | null;
  endDateTime: Date | null;
  isAllDay: boolean;
  calendarName?: string;
};
