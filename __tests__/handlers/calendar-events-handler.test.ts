import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { calendarEventsHandler } from "../../src/handlers/calendar-events-handler";
import { AwsParameterFetcher } from "../../src/lib/aws-parameter-fetcher";
import { CalendarEventsUseCase } from "../../src/usecases/calendar-events-usecase";

describe("calendarEventsHandler", () => {
  let executeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // AwsParameterFetcherのモック
    spyOn(AwsParameterFetcher.prototype, "call").mockResolvedValue(
      "mock-value"
    );
  });

  afterEach(() => {
    executeSpy?.mockRestore?.();
  });

  it("正常系: カレンダーイベントの通知処理が成功すること", async () => {
    // Given
    executeSpy = spyOn(
      CalendarEventsUseCase.prototype,
      "execute"
    ).mockResolvedValue();

    // When
    const response = await calendarEventsHandler();

    // Then
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: "カレンダーイベントの通知処理が完了しました",
    });
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it("異常系: カレンダーイベントの通知処理でエラーが発生した場合、500エラーを返すこと", async () => {
    // Given
    executeSpy = spyOn(
      CalendarEventsUseCase.prototype,
      "execute"
    ).mockImplementation(() => Promise.reject(new Error("テストエラー")));

    // When
    const response = await calendarEventsHandler();

    // Then
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "カレンダーイベントの通知処理中にエラーが発生しました",
    });
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });
});
