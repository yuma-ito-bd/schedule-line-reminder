import { LineWebhookUseCase } from "../src/usecases/line-webhook-usecase";
import { LineMessagingApiClientMock } from "./mocks/line-messaging-api-client-mock";
import { MockGoogleAuth } from "./mocks/mock-google-auth";
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
  } as LineWebhookEvent;
}

describe("LineWebhookUseCase", () => {
  let mockLineClient: LineMessagingApiClientMock;
  let mockAuthUrlGenerator: MockGoogleAuth;
  let useCase: LineWebhookUseCase;

  beforeEach(() => {
    mockLineClient = new LineMessagingApiClientMock();
    mockAuthUrlGenerator = new MockGoogleAuth();
    useCase = new LineWebhookUseCase(mockLineClient, mockAuthUrlGenerator);
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

      // When
      const result = await useCase.handleWebhookEvent(event);

      // Then
      expect(generateAuthUrlSpy).toHaveBeenCalledTimes(1);
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
  });
});
