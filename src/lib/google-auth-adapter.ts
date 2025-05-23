import { auth } from "@googleapis/calendar";
import { Config } from "./config";
import type { Schema$GoogleAuth } from "../types/google-auth";

/**
 * Google Calendar APIの認可URLを生成するクラス
 * 参考: https://developers.google.com/identity/protocols/oauth2/web-server?hl=ja
 */
export class GoogleAuthAdapter implements Schema$GoogleAuth {
  /** Google OAuth2クライアント */
  private readonly oauth2Client;

  constructor() {
    const config = Config.getInstance();
    this.oauth2Client = new auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Google Calendar APIの認可URLを生成する
   * @returns 認可URL
   */
  generateAuthUrl(): string {
    // カレンダーの読み取り権限のみを要求
    const scopes = [
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly", // カレンダーリストの読み取り
      "https://www.googleapis.com/auth/calendar.events.readonly", // カレンダーイベントの読み取り
    ];

    return this.oauth2Client.generateAuthUrl({
      // オフラインアクセスを有効化（リフレッシュトークンを取得するため）
      access_type: "offline",
      // 要求する権限スコープ
      scope: scopes,
      // インクリメンタル認可を有効化（推奨）
      include_granted_scopes: true,
    });
  }
}
