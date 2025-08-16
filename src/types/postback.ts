export const ADD_CALENDAR_SELECT = "ADD_CALENDAR_SELECT" as const;
export const DELETE_CALENDAR_SELECT = "DELETE_CALENDAR_SELECT" as const;

export type PostbackAction = typeof ADD_CALENDAR_SELECT | typeof DELETE_CALENDAR_SELECT;

export type AddCalendarPostback = {
  action: typeof ADD_CALENDAR_SELECT;
  calendarId: string;
  calendarName: string;
};

export type DeleteCalendarPostback = {
  action: typeof DELETE_CALENDAR_SELECT;
  calendarId: string;
  calendarName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAddCalendarPostback(value: unknown): value is AddCalendarPostback {
  if (!isRecord(value)) return false;
  return (
    value["action"] === ADD_CALENDAR_SELECT &&
    typeof value["calendarId"] === "string" &&
    typeof value["calendarName"] === "string"
  );
}

export function isDeleteCalendarPostback(value: unknown): value is DeleteCalendarPostback {
  if (!isRecord(value)) return false;
  return (
    value["action"] === DELETE_CALENDAR_SELECT &&
    typeof value["calendarId"] === "string"
  );
}
