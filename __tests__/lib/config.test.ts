import { describe, it, expect, mock } from "bun:test";
import { Config } from "../../src/lib/config";
import { ParameterFetcherMock } from "../mocks/parameter-fetcher-mock";

describe("Config", () => {
  it("シングルトンであること", () => {
    const config1 = Config.getInstance();
    const config2 = Config.getInstance();
    expect(config1).toBe(config2);
  });

  describe("環境変数からの読み取り", () => {
    it("環境変数が設定されている場合は環境変数から読み取る", async () => {
      process.env.GOOGLE_CLIENT_ID = "client-id";
      process.env.GOOGLE_CLIENT_SECRET = "client-secret";
      process.env.GOOGLE_REDIRECT_URI = "redirect-uri";
      process.env.LINE_CHANNEL_ACCESS_TOKEN = "channel-access-token";
      process.env.LINE_USER_ID = "line-user-id";

      const config = Config.getInstance();
      await config.init(new ParameterFetcherMock());
      expect(config.GOOGLE_CLIENT_ID).toBe("client-id");
      expect(config.GOOGLE_CLIENT_SECRET).toBe("client-secret");
      expect(config.GOOGLE_REDIRECT_URI).toBe("redirect-uri");
      expect(config.LINE_CHANNEL_ACCESS_TOKEN).toBe("channel-access-token");
      expect(config.LINE_USER_ID).toBe("line-user-id");
    });
  });

  describe("パラメータストアからの読み取り", () => {
    it("環境変数が設定されていない場合はパラメータストアから読み取る", async () => {
      process.env.GOOGLE_CLIENT_ID = "";
      process.env.GOOGLE_CLIENT_SECRET = "";
      process.env.GOOGLE_REDIRECT_URI = "";
      process.env.LINE_CHANNEL_ACCESS_TOKEN = "";
      process.env.LINE_USER_ID = "";

      const config = Config.getInstance();
      await config.init(new ParameterFetcherMock());
      expect(config.GOOGLE_CLIENT_ID).toBe("mock-google-client-id");
      expect(config.GOOGLE_CLIENT_SECRET).toBe("mock-google-client-secret");
      expect(config.GOOGLE_REDIRECT_URI).toBe("mock-google-redirect-uri");
      expect(config.LINE_CHANNEL_ACCESS_TOKEN).toBe(
        "mock-line-channel-access-token"
      );
      expect(config.LINE_USER_ID).toBe("mock-line-user-id");
    });
  });
});
