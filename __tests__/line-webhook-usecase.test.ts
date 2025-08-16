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

class DummyUserCalendarRepository {
  async addCalendar() {}
  async deleteCalendar() {}
  async getUserCalendars() { return []; }
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
      const expectedMessages = [
        "Googleカレンダーとの連携を開始します。以下のURLをクリックして認可を行ってください：",
        "https://example.com/auth",
      ];

      const generateAuthUrlSpy = spyOn(mockAuthUrlGenerator, "generateAuthUrl");
      const replyTextMessagesSpy = spyOn(mockLineClient, "replyTextMessages");
      const saveStateSpy = spyOn(mockStateRepository, "saveState");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(generateAuthUrlSpy).toHaveBeenCalledTimes(1);
      expect(saveStateSpy).toHaveBeenCalledWith(
        expect.any(String),
        "test-user-id"
      );
      expect(replyTextMessagesSpy).toHaveBeenCalledWith(
        "test-reply-token",
        expectedMessages
      );

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

    test("unfollowイベントの場合、トークン情報を削除する", async () => {
      // Given
      const event = createUnfollowEvent();
      const deleteTokenSpy = spyOn(mockTokenRepository, "deleteToken");

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(deleteTokenSpy).toHaveBeenCalledWith("test-user-id");
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
  });
});
