export type LineWebhookEvent = {
  type: "message";
  message: {
    type: "text";
    text: string;
  };
  replyToken: string;
  source: {
    type: "user";
    userId: string;
  };
  timestamp: number;
  mode: "active";
};
