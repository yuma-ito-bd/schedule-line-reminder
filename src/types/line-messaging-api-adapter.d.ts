import { messagingApi } from "@line/bot-sdk";

export type Schema$LineMessagingApiClient = {
  pushTextMessages: (
    userId: string,
    texts: string[]
  ) => Promise<messagingApi.PushMessageResponse>;
};
