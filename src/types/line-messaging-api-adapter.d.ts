import { messagingApi } from "@line/bot-sdk";

export type Schema$LineMessagingApiClient = {
  pushTextMessages: (
    userId: string,
    texts: string[]
  ) => Promise<messagingApi.PushMessageResponse>;
  replyTextMessages: (
    replyToken: string,
    texts: string[]
  ) => Promise<messagingApi.ReplyMessageResponse>;
  replyTextWithQuickReply: (
    replyToken: string,
    text: string,
    items: messagingApi.QuickReplyItem[]
  ) => Promise<messagingApi.ReplyMessageResponse>;
  replyTemplateMessage: (
    replyToken: string,
    altText: string,
    template: messagingApi.TemplateMessage["template"]
  ) => Promise<messagingApi.ReplyMessageResponse>;
};
