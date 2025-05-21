import { messagingApi } from "@line/bot-sdk";
import { Config } from "./lib/config";
import type { Schema$LineMessagingApiClient } from "./types/line-messaging-api-adapter";

export class LineMessagingApiClient implements Schema$LineMessagingApiClient {
  private readonly client;

  constructor() {
    const config = Config.getInstance();
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
    });
  }

  async pushTextMessages(userId: string, texts: string[]) {
    const messages: messagingApi.TextMessage[] = texts.map((text) => ({
      type: "text",
      text,
    }));
    const request: messagingApi.PushMessageRequest = {
      to: userId,
      messages,
    };
    console.debug(request);
    const response = await this.client.pushMessageWithHttpInfo(request);
    console.debug(response);
    return response.body;
  }

  async replyTextMessages(replyToken: string, texts: string[]) {
    const messages: messagingApi.TextMessage[] = texts.map((text) => ({
      type: "text",
      text,
    }));
    const request: messagingApi.ReplyMessageRequest = {
      replyToken,
      messages,
    };
    console.debug(request);
    const response = await this.client.replyMessageWithHttpInfo(request);
    console.debug(response);
    return response.body;
  }
}
