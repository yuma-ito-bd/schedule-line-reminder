import { OAuth2Client } from "google-auth-library";

/**
 * Google認証の型定義
 */
export type Schema$GoogleAuth = {
  /**
   * Google Calendar APIの認可URLを生成する
   * @returns 認可URL
   */
  generateAuthUrl(): string;

  /**
   * 認証済みのOAuth2クライアントを取得する
   * @returns OAuth2クライアント
   */
  getAuthClient(): OAuth2Client;

  /**
   * アクセストークンとリフレッシュトークンをセットする
   * @param token アクセストークンとリフレッシュトークン
   */
  setTokens(token: Schema$GoogleAuthToken): void;
};

export type Schema$GoogleAuthToken = {
  accessToken: string;
  refreshToken: string;
};
