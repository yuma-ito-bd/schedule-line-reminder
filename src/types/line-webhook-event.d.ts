/**
 * LINE Messaging APIから受け取るWebhookイベントの型定義
 * 参考: https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
 */
export type LineWebhookEvent = {
  /** イベントの種類 */
  type: "message" | "unfollow";
  /** メッセージの内容（typeがmessageの場合のみ） */
  message?: {
    /** メッセージの種類。テキストメッセージの場合は "text" */
    type: "text";
    /** メッセージのテキスト */
    text: string;
  };
  /** リプライトークン。メッセージに返信する際に使用（typeがmessageの場合のみ） */
  replyToken?: string;
  /** イベントの送信元情報 */
  source: {
    /** 送信元の種類。ユーザーからのメッセージの場合は "user" */
    type: "user";
    /** 送信元のユーザーID */
    userId: string;
  };
  /** イベントの発生時刻（UNIX時間） */
  timestamp: number;
  /** チャネルの状態。通常は "active" */
  mode: "active";
};
