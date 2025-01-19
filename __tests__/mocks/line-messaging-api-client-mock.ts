import type { Schema$LineMessagingApiClient } from "../../src/types/line-messaging-api-adapter";

export class LineMessagingApiClientMock
  implements Schema$LineMessagingApiClient
{
  async pushTextMessages(userId: string, texts: string[]) {
    return {
      sentMessages: [],
    };
  }
}
