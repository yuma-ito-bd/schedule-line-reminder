import type { Schema$LineMessagingApiClient } from "../../src/types/line-messaging-api-adapter";
import type { messagingApi } from "@line/bot-sdk";

export class LineMessagingApiClientMock
  implements Schema$LineMessagingApiClient
{
  async pushTextMessages(userId: string, texts: string[]) {
    return {
      sentMessages: [],
    };
  }

  async replyTextMessages(replyToken: string, texts: string[]) {
    return {
      sentMessages: [],
    };
  }

  async replyTextWithQuickReply(
    replyToken: string,
    text: string,
    items: messagingApi.QuickReplyItem[]
  ) {
    return {
      sentMessages: [],
    };
  }

  async replyTemplateMessage(
    replyToken: string,
    altText: string,
    template: messagingApi.TemplateMessage["template"]
  ) {
    return {
      sentMessages: [],
    };
  }
}
