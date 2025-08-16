/**
 * LINE Messaging APIから受け取るWebhookイベントの型定義
 * 参考: https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
 */

/** メッセージイベントの型定義 */
type MessageEvent = {
  /** イベントの種類 */
  type: "message";
  /** メッセージの内容 */
  message: {
    /** メッセージの種類。テキストメッセージの場合は "text" */
    type: "text";
    /** メッセージのテキスト */
    text: string;
  };
  /** リプライトークン。メッセージに返信する際に使用 */
  replyToken: string;
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

/** 友だち解除イベントの型定義 */
type UnfollowEvent = {
  /** イベントの種類 */
  type: "unfollow";
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

/** Postbackイベントの型定義 */
type PostbackEvent = {
  /** イベントの種類 */
  type: "postback";
  /** リプライトークン。メッセージに返信する際に使用 */
  replyToken: string;
  /** イベントの送信元情報 */
  source: {
    /** 送信元の種類。ユーザーからのメッセージの場合は "user" */
    type: "user";
    /** 送信元のユーザーID */
    userId: string;
  };
  /** Postbackの内容 */
  postback: {
    /** data にシリアライズされた文字列 */
    data: string;
    /** 日付選択などの追加パラメータ */
    params?: Record<string, unknown>;
  };
  /** イベントの発生時刻（UNIX時間） */
  timestamp: number;
  /** チャネルの状態。通常は "active" */
  mode: "active";
};

/** LINE Messaging APIから受け取るWebhookイベントの型定義 */
export type LineWebhookEvent = MessageEvent | UnfollowEvent | PostbackEvent;
