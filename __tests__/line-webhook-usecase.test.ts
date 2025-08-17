import { LineWebhookUseCase } from "../src/usecases/line-webhook-usecase";
import { LineMessagingApiClientMock } from "./mocks/line-messaging-api-client-mock";
import { MockGoogleAuth } from "./mocks/mock-google-auth";
import { MockOAuthStateRepository } from "./mocks/mock-oauth-state-repository";
import { MockTokenRepository } from "./mocks/mock-token-repository";
import type { LineWebhookEvent } from "../src/types/line-webhook-event";
import { expect, test, describe, beforeEach, spyOn } from "bun:test";

function createTextMessageEvent(text: string): LineWebhookEvent {
  return {
    type: "message",
    message: {
      type: "text",
      text,
    },
    replyToken: "test-reply-token",
    source: {
      type: "user",
      userId: "test-user-id",
    },
    timestamp: Date.now(),
    mode: "active",
  };
}

function createUnfollowEvent(): LineWebhookEvent {
  return {
    type: "unfollow",
    source: {
      type: "user",
      userId: "test-user-id",
    },
    timestamp: Date.now(),
    mode: "active",
  };
}

function createPostbackEvent(data: string): LineWebhookEvent {
  return {
    type: "postback",
    replyToken: "test-reply-token",
    source: {
      type: "user",
      userId: "test-user-id",
    },
    postback: { data },
    timestamp: Date.now(),
    mode: "active",
  } as any;
}

class DummyUserCalendarRepository {
  async addCalendar() {}
  async deleteCalendar() {}
  async getUserCalendars() { return []; }
  async deleteAll(userId: string, calendarIds: string[]) {}
}

describe("LineWebhookUseCase", () => {
  let mockLineClient: LineMessagingApiClientMock;
  let mockAuthUrlGenerator: MockGoogleAuth;
  let mockStateRepository: MockOAuthStateRepository;
  let mockTokenRepository: MockTokenRepository;
  let useCase: LineWebhookUseCase;

  beforeEach(() => {
    mockLineClient = new LineMessagingApiClientMock();
    mockAuthUrlGenerator = new MockGoogleAuth();
    mockStateRepository = new MockOAuthStateRepository();
    mockTokenRepository = new MockTokenRepository();
    useCase = new LineWebhookUseCase(
      mockLineClient,
      mockAuthUrlGenerator,
      mockStateRepository,
      mockTokenRepository,
      new DummyUserCalendarRepository() as any
    );
  });

  describe("handleWebhookEvent", () => {
    test("イベントがない場合はno eventメッセージを返す", async () => {
      const result = await useCase.handleWebhookEvent(
        null as unknown as LineWebhookEvent
      );
      expect(result).toEqual({ success: true, message: "no event" });
    });

    test("カレンダー追加メッセージの場合、認可URLを送信する", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー追加");
      const guidance = "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください：";

      const generateAuthUrlSpy = spyOn(mockAuthUrlGenerator, "generateAuthUrl");
      const replyQuickSpy = spyOn(mockLineClient, "replyTextWithQuickReply");
      const saveStateSpy = spyOn(mockStateRepository, "saveState");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(generateAuthUrlSpy).toHaveBeenCalledTimes(1);
      expect(saveStateSpy).toHaveBeenCalledWith(
        expect.any(String),
        "test-user-id"
      );
      expect(replyQuickSpy).toHaveBeenCalled();
      const args = (replyQuickSpy.mock.calls[0] as any[]);
      expect(args[0]).toBe("test-reply-token");
      expect(args[1]).toBe(guidance);
      const items = args[2];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(1);
      expect(items[0].type).toBe("action");
      expect(items[0].action.type).toBe("uri");
      expect(items[0].action.label).toBe("Googleでログイン");
      expect(items[0].action.uri).toBe("https://example.com/auth");

      expect(result).toEqual({
        success: true,
        message: "認可URLを送信しました",
      });
    });

    test("未対応のメッセージの場合は未対応メッセージを返す", async () => {
      // Given
      const event = createTextMessageEvent("その他のメッセージ");
      const replyTextMessagesSpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(replyTextMessagesSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: "未対応のメッセージです",
      });
    });

    test("unfollowイベントの場合、トークン情報を削除しユーザーカレンダーも削除する", async () => {
      // Given
      const event = createUnfollowEvent();
      const deleteTokenSpy = spyOn(mockTokenRepository, "deleteToken");
      const getCalendarsSpy = spyOn(
        DummyUserCalendarRepository.prototype as any,
        "getUserCalendars"
      ).mockResolvedValue([
        { userId: "test-user-id", calendarId: "cal-1", calendarName: "仕事", createdAt: new Date(), updatedAt: new Date() },
        { userId: "test-user-id", calendarId: "cal-2", calendarName: "プライベート", createdAt: new Date(), updatedAt: new Date() },
      ]);
      const deleteAllSpy = spyOn(
        DummyUserCalendarRepository.prototype as any,
        "deleteAll"
      ).mockResolvedValue(undefined);

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(deleteTokenSpy).toHaveBeenCalledWith("test-user-id");
      expect(getCalendarsSpy).toHaveBeenCalledWith("test-user-id");
      expect(deleteAllSpy).toHaveBeenCalledWith("test-user-id", ["cal-1", "cal-2"]);
      expect(result).toEqual({
        success: true,
        message: "トークン情報を削除しました",
      });
    });

    test("unfollowイベントでトークン削除に失敗した場合、エラーメッセージを返す", async () => {
      // Given
      const event = createUnfollowEvent();
      const deleteTokenSpy = spyOn(
        mockTokenRepository,
        "deleteToken"
      ).mockRejectedValue(new Error("Failed to delete token"));

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(deleteTokenSpy).toHaveBeenCalledWith("test-user-id");
      expect(result).toEqual({
        success: false,
        message: "トークン情報の削除に失敗しました",
      });
    });

    // New tests for "カレンダー一覧" feature
    test("カレンダー一覧メッセージの場合、購読中カレンダーを整形して返信する", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー一覧");
      const mockUserCalendarRepository = {
        async getUserCalendars(userId: string) {
          expect(userId).toBe("test-user-id");
          return [
            {
              userId: "test-user-id",
              calendarId: "cal-1",
              calendarName: "仕事",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              userId: "test-user-id",
              calendarId: "cal-2",
              calendarName: "プライベート",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        },
      } as any;
      const useCaseWithCalendars = new LineWebhookUseCase(
        mockLineClient,
        mockAuthUrlGenerator,
        mockStateRepository,
        mockTokenRepository,
        mockUserCalendarRepository
      );
      const replyTextMessagesSpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCaseWithCalendars.handleWebhookEvent(event);

      // Then
      expect(replyTextMessagesSpy).toHaveBeenCalledWith(
        "test-reply-token",
        [
          [
            "購読中のカレンダー:",
            "- 仕事 (cal-1)",
            "- プライベート (cal-2)",
          ].join("\n"),
        ]
      );
      expect(result).toEqual({
        success: true,
        message: "カレンダー一覧を返信しました",
      });
    });

    test("カレンダー（短縮コマンド）の場合、購読カレンダーがない時はガイダンスを返信する", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー");
      const mockUserCalendarRepository = {
        async getUserCalendars() {
          return [];
        },
      } as any;
      const useCaseNoCalendars = new LineWebhookUseCase(
        mockLineClient,
        mockAuthUrlGenerator,
        mockStateRepository,
        mockTokenRepository,
        mockUserCalendarRepository
      );
      const replyTextMessagesSpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCaseNoCalendars.handleWebhookEvent(event);

      // Then
      expect(replyTextMessagesSpy).toHaveBeenCalledWith(
        "test-reply-token",
        ["購読中のカレンダーはありません。『カレンダー追加』で登録できます。"]
      );
      expect(result).toEqual({
        success: true,
        message: "カレンダー一覧を返信しました",
      });
    });

    // New tests for calendar add quick reply flow (with factory DI)
    test("カレンダー追加: トークン登録済みならクイックリプライを送信し、ラベルは20文字に切り詰められる", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー追加");
      const longName = "これは非常に長いカレンダー名で20文字を超えます"; // > 20 chars
      const mockUserCalendarRepository = new DummyUserCalendarRepository();
      const useCaseWithToken = new LineWebhookUseCase(
        mockLineClient,
        mockAuthUrlGenerator,
        mockStateRepository,
        {
          ...mockTokenRepository,
          async getToken() {
            return {
              userId: "test-user-id",
              accessToken: "access",
              refreshToken: "refresh",
            };
          },
        } as any,
        mockUserCalendarRepository as any,
        () => ({
          async fetchCalendarList() {
            return [
              { id: "cal-1", summary: longName },
              { id: "cal-2", summary: "短い" },
            ] as any;
          },
          async fetchEvents() { return []; },
        }) as any
      );
      // stub google auth setTokens (no-op)
      spyOn(mockAuthUrlGenerator, "setTokens").mockReturnValue();

      // Spy on client to assert quick reply was used
      const replyQuickSpy = spyOn(mockLineClient, "replyTextWithQuickReply");

      // When
      const result = await useCaseWithToken.handleWebhookEvent(event);

      // Then
      expect(replyQuickSpy).toHaveBeenCalled();
      const args = (replyQuickSpy.mock.calls[0] as any[]);
      expect(args[0]).toBe("test-reply-token");
      expect(args[1]).toBe("追加するカレンダーを選択してください");
      const items = args[2];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);
      // label truncated to <= 20
      expect(items[0].action.label.length).toBeLessThanOrEqual(20);
      expect(items[0].action.data).toContain("\"action\":\"ADD_CALENDAR_SELECT\"");
      // rawLabel preserved in calendarName
      expect(items[0].action.data).toContain(longName);
      expect(result).toEqual({ success: true, message: "カレンダー追加クイックリプライを送信しました" });
    });

    test("Postback: ADD_CALENDAR_SELECT でカレンダーを追加し、完了メッセージを返す", async () => {
      // Given
      const event = createPostbackEvent(
        JSON.stringify({ action: "ADD_CALENDAR_SELECT", calendarId: "cal-1", calendarName: "仕事" })
      );
      const addSpy: any = spyOn(DummyUserCalendarRepository.prototype, "addCalendar");
      const replySpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(addSpy).toHaveBeenCalledWith({ userId: "test-user-id", calendarId: "cal-1", calendarName: "仕事" });
      expect(replySpy).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: "カレンダー追加を完了しました" });
    });

    test("Postback: JSON parse エラー時は失敗を返し、後続にフォールスルーしない", async () => {
      // Given invalid JSON
      const event = createPostbackEvent("{invalid-json}");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toBe("ポストバック処理でエラーが発生しました");
    });

    // New tests for delete quick reply and postback deletion
    test("カレンダー削除: 購読中がある場合、クイックリプライを送信し、ラベルは20文字に切り詰められる", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー削除");
      const longName = "とてもとても長い購読中のカレンダー名で二十文字超";
      const mockUserCalendarRepository = {
        async getUserCalendars(userId: string) {
          expect(userId).toBe("test-user-id");
          return [
            {
              userId: "test-user-id",
              calendarId: "cal-1",
              calendarName: longName,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              userId: "test-user-id",
              calendarId: "cal-2",
              calendarName: "短い",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        },
      } as any;
      const useCaseWithCalendars = new LineWebhookUseCase(
        mockLineClient,
        mockAuthUrlGenerator,
        mockStateRepository,
        mockTokenRepository,
        mockUserCalendarRepository
      );
      const replyQuickSpy = spyOn(mockLineClient, "replyTextWithQuickReply");

      // When
      const result = await useCaseWithCalendars.handleWebhookEvent(event);

      // Then
      expect(replyQuickSpy).toHaveBeenCalled();
      const args = (replyQuickSpy.mock.calls[0] as any[]);
      expect(args[0]).toBe("test-reply-token");
      expect(args[1]).toBe("削除するカレンダーを選択してください");
      const items = args[2];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);
      // label truncated to <= 20
      expect(items[0].action.label.length).toBeLessThanOrEqual(20);
      expect(items[0].action.data).toContain("\"action\":\"DELETE_CALENDAR_SELECT\"");
      expect(items[0].action.data).toContain("cal-1");
      expect(items[0].action.data).toContain(longName);
      expect(result).toEqual({ success: true, message: "カレンダー削除クイックリプライを送信しました" });
    });

    test("カレンダー削除: 購読が0件なら案内を返信する", async () => {
      // Given
      const event = createTextMessageEvent("カレンダー削除");
      const mockUserCalendarRepository = {
        async getUserCalendars() { return []; },
      } as any;
      const useCaseNoCalendars = new LineWebhookUseCase(
        mockLineClient,
        mockAuthUrlGenerator,
        mockStateRepository,
        mockTokenRepository,
        mockUserCalendarRepository
      );
      const replyTextSpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCaseNoCalendars.handleWebhookEvent(event);

      // Then
      expect(replyTextSpy).toHaveBeenCalledWith(
        "test-reply-token",
        ["購読中のカレンダーはありません。『カレンダー追加』で登録できます。"]
      );
      expect(result).toEqual({ success: true, message: "削除対象のカレンダーがありませんでした" });
    });

    test("Postback: DELETE_CALENDAR_SELECT でカレンダーを削除し、完了メッセージを返す", async () => {
      // Given
      const event = createPostbackEvent(
        JSON.stringify({ action: "DELETE_CALENDAR_SELECT", calendarId: "cal-1", calendarName: "仕事" })
      );
      const deleteSpy: any = spyOn(DummyUserCalendarRepository.prototype, "deleteCalendar");
      const replySpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(deleteSpy).toHaveBeenCalledWith("test-user-id", "cal-1");
      expect(replySpy).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: "カレンダー削除を完了しました" });
    });

    // New tests for Help
    test("ヘルプ/ help メッセージの場合、ヘルプを返信する", async () => {
      // Given
      const event1 = createTextMessageEvent("ヘルプ");
      const event2 = createTextMessageEvent("help");
      const replyTextSpy = spyOn(mockLineClient, "replyTextMessages");

      // When
      const result1 = await useCase.handleWebhookEvent(event1);
      const result2 = await useCase.handleWebhookEvent(event2);

      // Then
      expect(replyTextSpy).toHaveBeenCalledWith("test-reply-token", [expect.stringContaining("利用可能なコマンド:")]);
      expect(result1).toEqual({ success: true, message: "ヘルプを返信しました" });
      expect(result2).toEqual({ success: true, message: "ヘルプを返信しました" });
    });

    test("ヘルプメッセージ送信に失敗した場合はエラーを返す", async () => {
      // Given
      const event = createTextMessageEvent("ヘルプ");
      const replyTextSpy = spyOn(mockLineClient, "replyTextMessages").mockRejectedValue(new Error("send error"));

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(replyTextSpy).toHaveBeenCalledWith("test-reply-token", [expect.any(String)]);
      expect(result).toEqual({ success: false, message: "ヘルプメッセージの送信に失敗しました" });
    });
  });
});
