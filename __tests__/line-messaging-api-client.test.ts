import { describe, it, expect, mock } from "bun:test";
import { LineMessagingApiClient } from "../src/line-messaging-api-client";

describe("LineMessagingApiClient", () => {
  describe("constructor", () => {
    it("正しく初期化されていること", () => {
      const lineMessagingApiClient = new LineMessagingApiClient();
      expect(lineMessagingApiClient).toBeDefined();
    });
  });

  describe("pushTextMessages", () => {
    it("正しくメッセージを送信できること", async () => {
      const lineMessagingApiClient = new LineMessagingApiClient();
      const pushMessageMock = mock().mockResolvedValue({});
      const lineClientMock = {
        pushMessageWithHttpInfo: pushMessageMock,
      };
      (lineMessagingApiClient as any).client = lineClientMock;

      const userId = "userId";
      const texts = ["text1", "text2"];
      await lineMessagingApiClient.pushTextMessages(userId, texts);
      expect(pushMessageMock).toHaveBeenCalled();
      expect(pushMessageMock.mock.calls[0][0]).toEqual({
        to: userId,
        messages: [
          { type: "text", text: "text1" },
          { type: "text", text: "text2" },
        ],
      });
    });
  });

  describe("replyTextMessages", () => {
    // FIXME: Bunのモックの仕様上、他のテストの影響を受けるため、テストをスキップ
    it.skip("正しくメッセージを返信できること", async () => {
      const lineMessagingApiClient = new LineMessagingApiClient();
      const replyMessageMock = mock().mockResolvedValue({});
      const lineClientMock = {
        replyMessageWithHttpInfo: replyMessageMock,
      };
      (lineMessagingApiClient as any).client = lineClientMock;

      const replyToken = "reply-token";
      const texts = ["text1", "text2"];
      await lineMessagingApiClient.replyTextMessages(replyToken, texts);
      expect(replyMessageMock).toHaveBeenCalled();
      expect(replyMessageMock.mock.calls[0][0]).toEqual({
        replyToken,
        messages: [
          { type: "text", text: "text1" },
          { type: "text", text: "text2" },
        ],
      });
    });
  });
});
