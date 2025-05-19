import { describe, it, expect, mock } from "bun:test";
import { GoogleAuthUrlGenerator } from "../src/lib/google-auth-url-generator";
import { Config } from "../src/lib/config";
import { ParameterFetcherMock } from "./mocks/parameter-fetcher-mock";

/**
 * GoogleAuthUrlGeneratorのテスト
 */
describe("GoogleAuthUrlGenerator", () => {
  describe("constructor", () => {
    it("正しく初期化されていること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const generator = new GoogleAuthUrlGenerator();
      expect(generator).toBeDefined();
    });
  });

  describe("generateAuthUrl", () => {
    it("認可URLが生成されること", async () => {
      // モックの設定値をConfigに設定
      const parameterFetcher = new ParameterFetcherMock();
      await Config.getInstance().init(parameterFetcher);
      const generator = new GoogleAuthUrlGenerator();
      const authUrl = generator.generateAuthUrl();

      // 認可URLに必要な要素が含まれていることを確認
      expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth"); // 認可エンドポイント
      expect(authUrl).toContain("access_type=offline"); // オフラインアクセス
      expect(authUrl).toContain("include_granted_scopes=true"); // インクリメンタル認可
      expect(authUrl).toContain(
        "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.calendarlist.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly"
      ); // 要求する権限スコープ
    });
  });
});
