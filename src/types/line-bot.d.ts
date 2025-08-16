export type AddCalendarSelectPostbackData = {
  action: "ADD_CALENDAR_SELECT";
  calendarId: string;
  calendarName: string;
};

export type DeleteCalendarConfirmPostbackData = {
  action: "DELETE_CALENDAR_CONFIRM";
  calendarId: string;
  calendarName: string;
};

export type CancelPostbackData = {
  action: "CANCEL";
};

export type PostbackData =
  | AddCalendarSelectPostbackData
  | DeleteCalendarConfirmPostbackData
  | CancelPostbackData;

export declare function serializePostbackData(data: PostbackData): string;

export declare function parsePostbackData(data: string): PostbackData;