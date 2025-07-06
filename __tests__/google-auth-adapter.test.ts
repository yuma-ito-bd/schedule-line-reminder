import { describe, it, expect, mock, spyOn } from "bun:test";
import { GoogleAuthAdapter } from "../src/lib/google-auth-adapter";
import { Config } from "../src/lib/config";
import { ParameterFetcherMock } from "../src/lib/parameter-fetcher-mock";
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
      const client = googleAuth.getAuthClient();
      expect(client).toBeInstanceOf(OAuth2Client);
    });
  });

  describe("setTokens", () => {
    it("トークンが正しくセットされること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const client = googleAuth.getAuthClient();
      const setCredentialsSpy = spyOn(client, "setCredentials");

      googleAuth.setTokens({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      });

      expect(setCredentialsSpy).toHaveBeenCalledWith({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
      });
    });
  });

  describe("getTokensFromCode", () => {
    it("認可コードからトークンを取得できること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const client = googleAuth.getAuthClient();
      const getTokenSpy = spyOn(client, "getToken");
      getTokenSpy.mockImplementation(() =>
        Promise.resolve({
          tokens: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
          },
          res: {
            data: {
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
            },
            config: {},
            status: 200,
            statusText: "OK",
            headers: {},
            request: {
              responseURL: "https://oauth2.googleapis.com/token",
            },
          },
        })
      );

      const tokens = await googleAuth.getTokensFromCode("test-code");

      expect(getTokenSpy).toHaveBeenCalledWith("test-code");
      expect(tokens).toEqual({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      });
    });

    it("トークンが取得できない場合はエラーをスローすること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const client = googleAuth.getAuthClient();
      const getTokenSpy = spyOn(client, "getToken");
      getTokenSpy.mockImplementation(() =>
        Promise.resolve({
          tokens: {
            access_token: null,
            refresh_token: null,
          },
          res: {
            data: {
              access_token: null,
              refresh_token: null,
            },
            config: {},
            status: 200,
            statusText: "OK",
            headers: {},
            request: {
              responseURL: "https://oauth2.googleapis.com/token",
            },
          },
        })
      );

      await expect(googleAuth.getTokensFromCode("test-code")).rejects.toThrow(
        "Failed to get tokens from authorization code"
      );
    });
  });

  describe("setTokensUpdatedListener", () => {
    it("アクセストークンとリフレッシュトークンが両方存在する場合のみコールバックが呼ばれること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const googleAuth = new GoogleAuthAdapter();
      const client = googleAuth.getAuthClient();
      const onTokensSpy = spyOn(client, "on");
      const onTokensUpdated = mock(() => {});

      googleAuth.setTokensUpdatedListener(onTokensUpdated);

      // イベントリスナーが設定されたことを確認
      expect(onTokensSpy).toHaveBeenCalledWith("tokens", expect.any(Function));

      // イベントリスナーのコールバック関数を取得
      const tokensCallback = onTokensSpy.mock.calls[0][1];

      // アクセストークンとリフレッシュトークンが両方存在する場合
      tokensCallback({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
      });
      expect(onTokensUpdated).toHaveBeenCalledWith({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      // アクセストークンのみ存在する場合
      onTokensUpdated.mockClear();
      tokensCallback({
        access_token: "new-access-token",
        refresh_token: null,
      });
      expect(onTokensUpdated).not.toHaveBeenCalled();

      // リフレッシュトークンのみ存在する場合
      onTokensUpdated.mockClear();
      tokensCallback({
        access_token: null,
        refresh_token: "new-refresh-token",
      });
      expect(onTokensUpdated).not.toHaveBeenCalled();
    });
  });
});
