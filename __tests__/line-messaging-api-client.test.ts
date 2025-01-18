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
        pushMessage: pushMessageMock,
      };
      (lineMessagingApiClient as any).client = lineClientMock;

      const userId = "userId";
      const texts = ["text1", "text2"];
      lineMessagingApiClient.pushTextMessages(userId, texts);
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
});