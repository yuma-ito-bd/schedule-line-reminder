import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { CalendarEventsUseCase } from "../../src/usecases/calendar-events-usecase";
import { MockTokenRepository } from "../mocks/mock-token-repository";
import { LineMessagingApiClientMock } from "../mocks/line-messaging-api-client-mock";
import { GoogleCalendarApiAdapter } from "../../src/google-calendar-api-adapter";
import { CalendarEventsNotifier } from "../../src/calendar-events-notifier";

class DummyUserCalendarRepository {
  async addCalendar() {}
  async deleteCalendar() {}
  async getUserCalendars() {
    return [
      { userId: "user1", calendarId: "primary", calendarName: "メインカレンダー", createdAt: new Date(), updatedAt: new Date() },
    ];
  }
}

describe("CalendarEventsUseCase", () => {
  let notifierSpy: ReturnType<typeof spyOn>;
  let fetchEventsSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    notifierSpy?.mockReset?.();
    fetchEventsSpy?.mockReset?.();
  });

  describe("execute", () => {
    it("すべてのユーザーのカレンダーイベントを通知できること", async () => {
      // Given
      const tokenRepository = new MockTokenRepository();
      const lineMessagingApiClient = new LineMessagingApiClientMock();
      const userCalendarRepository = new DummyUserCalendarRepository() as any;
      const useCase = new CalendarEventsUseCase(
        tokenRepository,
        lineMessagingApiClient,
        userCalendarRepository
      );

      // GoogleCalendarApiAdapterのモック
      fetchEventsSpy = spyOn(
        GoogleCalendarApiAdapter.prototype,
        "fetchEvents"
      ).mockResolvedValue([
        {
          summary: "Event 1",
          start: { dateTime: "2024-01-01T00:00:00.000Z" },
          end: { dateTime: "2024-01-01T01:00:00.000Z" },
        },
      ]);
      notifierSpy = spyOn(CalendarEventsNotifier.prototype, "call");

      // When
      await useCase.execute();

      // Then
      expect(notifierSpy).toHaveBeenCalledTimes(2);
    });

    it("一部のユーザーでエラーが発生しても他のユーザーの処理は続行されること", async () => {
      // Given
      const tokenRepository = new MockTokenRepository();
      const lineMessagingApiClient = new LineMessagingApiClientMock();
      const userCalendarRepository = new DummyUserCalendarRepository() as any;
      const useCase = new CalendarEventsUseCase(
        tokenRepository,
        lineMessagingApiClient,
        userCalendarRepository
      );

      // GoogleCalendarApiAdapterのモック
      fetchEventsSpy = spyOn(GoogleCalendarApiAdapter.prototype, "fetchEvents")
        .mockImplementationOnce(() =>
          Promise.reject(new Error("Error for user1"))
        )
        .mockResolvedValueOnce([
          {
            summary: "Event 1",
            start: { dateTime: "2024-01-01T00:00:00.000Z" },
            end: { dateTime: "2024-01-01T01:00:00.000Z" },
          },
        ]);
      notifierSpy = spyOn(CalendarEventsNotifier.prototype, "call");

      // When
      await useCase.execute();

      // Then
      expect(notifierSpy).toHaveBeenCalledTimes(2);
    });

    it("トークンが存在しない場合は何も通知されないこと", async () => {
      // Given
      class EmptyTokenRepository extends MockTokenRepository {
        async getAllTokens() {
          return [];
        }
      }
      const tokenRepository = new EmptyTokenRepository();
      const lineMessagingApiClient = new LineMessagingApiClientMock();
      const userCalendarRepository = new DummyUserCalendarRepository() as any;
      const useCase = new CalendarEventsUseCase(
        tokenRepository,
        lineMessagingApiClient,
        userCalendarRepository
      );

      // GoogleCalendarApiAdapterのモック
      fetchEventsSpy = spyOn(
        GoogleCalendarApiAdapter.prototype,
        "fetchEvents"
      ).mockResolvedValue([]);
      notifierSpy = spyOn(CalendarEventsNotifier.prototype, "call");

      // When
      await useCase.execute();

      // Then
      expect(notifierSpy).toHaveBeenCalledTimes(0);
    });
  });
});
