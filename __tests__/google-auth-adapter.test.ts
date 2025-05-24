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
      const { url, state } = googleAuth.generateAuthUrl();

      // 認可URLに必要な要素が含まれていることを確認
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth"); // 認可エンドポイント
      expect(url).toContain("access_type=offline"); // オフラインアクセス
      expect(url).toContain("include_granted_scopes=true"); // インクリメンタル認可
      expect(url).toContain(
        "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.calendarlist.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly"
      ); // 要求する権限スコープ
      expect(state).toBeDefined(); // stateパラメータが生成されていること
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

  describe("getTokensFromCode", () => {
    it("認可コードからトークンを取得できること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const authClient = googleAuth.getAuthClient();

      // OAuth2ClientのgetTokenをモック
      const mockTokens = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
      };
      const mockResponse = {
        tokens: mockTokens,
        res: {} as any,
      };
      const getTokenMock = mock(() => Promise.resolve(mockResponse));
      authClient.getToken = getTokenMock;

      // 認可コードからトークンを取得
      const code = "test-auth-code";
      const tokens = await googleAuth.getTokensFromCode(code);

      // getTokenが正しい引数で呼ばれたことを確認
      expect(getTokenMock).toHaveBeenCalledWith(code);

      // 返却されたトークンが正しいことを確認
      expect(tokens).toEqual({
        accessToken: mockTokens.access_token,
        refreshToken: mockTokens.refresh_token,
      });
    });

    it("トークンが取得できない場合はエラーをスローすること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const authClient = googleAuth.getAuthClient();

      // OAuth2ClientのgetTokenをモック（トークンなし）
      const mockResponse = {
        tokens: {},
        res: {} as any,
      };
      const getTokenMock = mock(() => Promise.resolve(mockResponse));
      authClient.getToken = getTokenMock;

      // 認可コードからトークンを取得（エラーが発生することを期待）
      const code = "test-auth-code";
      expect(googleAuth.getTokensFromCode(code)).rejects.toThrow(
        "Failed to get tokens from authorization code"
      );
    });
  });
});
