import { expect, test, describe } from "bun:test";
import { ADD_CALENDAR_SELECT, DELETE_CALENDAR_SELECT, isAddCalendarPostback, isDeleteCalendarPostback } from "../../src/types/postback";

describe("postback type guards", () => {
  test("isAddCalendarPostback returns true for valid payload", () => {
    const payload = {
      action: ADD_CALENDAR_SELECT,
      calendarId: "id1",
      calendarName: "name1",
    };
    expect(isAddCalendarPostback(payload)).toBe(true);
  });

  test("isAddCalendarPostback returns false for invalid payloads", () => {
    expect(isAddCalendarPostback(null)).toBe(false);
    expect(isAddCalendarPostback({})).toBe(false);
    expect(isAddCalendarPostback({ action: ADD_CALENDAR_SELECT })).toBe(false);
    expect(isAddCalendarPostback({ action: ADD_CALENDAR_SELECT, calendarId: 1, calendarName: "a" })).toBe(false);
    expect(isAddCalendarPostback({ action: ADD_CALENDAR_SELECT, calendarId: "a" })).toBe(false);
  });

  test("isDeleteCalendarPostback returns true for valid payload", () => {
    const payload = {
      action: DELETE_CALENDAR_SELECT,
      calendarId: "id2",
    };
    expect(isDeleteCalendarPostback(payload)).toBe(true);
  });

  test("isDeleteCalendarPostback returns false for invalid payloads", () => {
    expect(isDeleteCalendarPostback(null)).toBe(false);
    expect(isDeleteCalendarPostback({})).toBe(false);
    expect(isDeleteCalendarPostback({ action: DELETE_CALENDAR_SELECT })).toBe(false);
    expect(isDeleteCalendarPostback({ action: DELETE_CALENDAR_SELECT, calendarId: 1 })).toBe(false);
  });
});