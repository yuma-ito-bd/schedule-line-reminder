import { describe, it, expect, mock } from "bun:test";
import { GoogleAuthAdapter } from "../src/lib/google-auth-adapter";
import { Config } from "../src/lib/config";
import { ParameterFetcherMock } from "./mocks/parameter-fetcher-mock";
import { OAuth2Client } from "google-auth-library";

/**
 * GoogleAuthAdapterのテスト
 */
describe("GoogleAuthAdapter", () => {
  describe("constructor", () => {
    it("正しく初期化されていること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      expect(googleAuth).toBeDefined();
    });
  });

  describe("generateAuthUrl", () => {
    it("認可URLが生成されること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const authUrl = googleAuth.generateAuthUrl();

      // 認可URLに必要な要素が含まれていることを確認
      expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth"); // 認可エンドポイント
      expect(authUrl).toContain("access_type=offline"); // オフラインアクセス
      expect(authUrl).toContain("include_granted_scopes=true"); // インクリメンタル認可
      expect(authUrl).toContain(
        "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.calendarlist.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly"
      ); // 要求する権限スコープ
    });
  });

  describe("getAuthClient", () => {
    it("OAuth2Clientを返すこと", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const authClient = googleAuth.getAuthClient();

      expect(authClient).toBeInstanceOf(OAuth2Client);
    });
  });

  describe("setTokens", () => {
    it("トークンが正しくセットされること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const authClient = googleAuth.getAuthClient();

      // OAuth2ClientのsetCredentialsをモック
      const setCredentialsMock = mock(() => {});
      authClient.setCredentials = setCredentialsMock;

      // トークンをセット
      const token = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      };
      googleAuth.setTokens(token);

      // setCredentialsが正しい引数で呼ばれたことを確認
      expect(setCredentialsMock).toHaveBeenCalledWith({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
      });
    });
  });
});
