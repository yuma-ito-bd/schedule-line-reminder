import { auth } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import { Config } from "./config";
import type {
  Schema$GoogleAuth,
  Schema$GoogleAuthToken,
} from "../types/google-auth";
import { randomBytes } from "crypto";

/**
 * Google Calendar APIの認証を管理するクラス
 * 参考: https://developers.google.com/identity/protocols/oauth2/web-server?hl=ja
 */
export class GoogleAuthAdapter implements Schema$GoogleAuth {
  /** Google OAuth2クライアント */
  private readonly oauth2Client: OAuth2Client;
  private readonly scopes = [
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly", // カレンダーリストの読み取り
    "https://www.googleapis.com/auth/calendar.events.readonly", // カレンダーイベントの読み取り
  ];

  constructor() {
    const config = Config.getInstance();
    this.oauth2Client = new auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * ランダムなstateパラメータを生成する
   * @returns 生成されたstateパラメータ
   */
  private generateState(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Google Calendar APIの認可URLを生成する
   * @returns 認可URLとstateパラメータ
   */
  generateAuthUrl(): { url: string; state: string } {
    const state = this.generateState();
    const url = this.oauth2Client.generateAuthUrl({
      // オフラインアクセスを有効化（リフレッシュトークンを取得するため）
      access_type: "offline",
      // 要求する権限スコープ
      scope: this.scopes,
      // インクリメンタル認可を有効化（推奨）
      include_granted_scopes: true,
      // CSRF対策のstateパラメータ
      state,
    });
    return { url, state };
  }

  /**
   * 認証済みのOAuth2クライアントを取得する
   * @returns OAuth2クライアント
   */
  getAuthClient(): OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * アクセストークンとリフレッシュトークンをセットする
   * @param token アクセストークンとリフレッシュトークン
   */
  setTokens(token: Schema$GoogleAuthToken): void {
    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
  }

  /**
   * 認可コードからアクセストークンとリフレッシュトークンを取得する
   * @param code 認可コード
   * @returns アクセストークンとリフレッシュトークン
   */
  async getTokensFromCode(code: string): Promise<Schema$GoogleAuthToken> {
    const { tokens } = await this.oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to get tokens from authorization code");
    }
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  /**
   * トークン更新イベントリスナーを設定する
   * @param onTokensUpdated トークン更新時のコールバック関数
   */
  setTokensUpdatedListener(
    onTokensUpdated: (tokens: Schema$GoogleAuthToken) => void
  ): void {
    this.oauth2Client.on("tokens", (tokens) => {
      if (tokens.access_token && tokens.refresh_token) {
        onTokensUpdated({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      }
    });
  }
}
