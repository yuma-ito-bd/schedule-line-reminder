export type UserCalendar = {
  userId: string;
  calendarId: string;
  calendarName: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateUserCalendar = {
  userId: string;
  calendarId: string;
  calendarName: string;
};

export type Schema$UserCalendarRepository = {
  addCalendar(calendar: CreateUserCalendar): Promise<void>;
  deleteCalendar(userId: string, calendarId: string): Promise<void>;
  getUserCalendars(userId: string): Promise<UserCalendar[]>;
};