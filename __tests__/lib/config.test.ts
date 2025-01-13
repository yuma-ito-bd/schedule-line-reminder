import { describe, it, expect, mock } from "bun:test";

import { Config } from "../../src/lib/config";

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
      process.env.GOOGLE_ACCESS_TOKEN = "access-token";
      process.env.GOOGLE_REFRESH_TOKEN = "refresh-token";

      const config = Config.getInstance();
      await config.init();
      expect(config.GOOGLE_CLIENT_ID).toBe("client-id");
      expect(config.GOOGLE_CLIENT_SECRET).toBe("client-secret");
      expect(config.GOOGLE_REDIRECT_URI).toBe("redirect-uri");
      expect(config.GOOGLE_ACCESS_TOKEN).toBe("access-token");
      expect(config.GOOGLE_REFRESH_TOKEN).toBe("refresh-token");
    });
  });

  describe("パラメータストアからの読み取り", () => {
    it("環境変数が設定されていない場合はパラメータストアから読み取る", async () => {
      process.env.GOOGLE_CLIENT_ID = "";
      process.env.GOOGLE_CLIENT_SECRET = "";
      process.env.GOOGLE_REDIRECT_URI = "";
      process.env.GOOGLE_ACCESS_TOKEN = "";
      process.env.GOOGLE_REFRESH_TOKEN = "";

      const fetchParameterMock = mock()
        .mockResolvedValueOnce("client-id")
        .mockResolvedValueOnce("client-secret")
        .mockResolvedValueOnce("redirect-uri")
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");

      mock.module("../../src/lib/parameter-fetcher", () => ({
        fetchParameter: fetchParameterMock,
      }));

      const config = Config.getInstance();
      await config.init();
      expect(config.GOOGLE_CLIENT_ID).toBe("client-id");
      expect(config.GOOGLE_CLIENT_SECRET).toBe("client-secret");
      expect(config.GOOGLE_REDIRECT_URI).toBe("redirect-uri");
      expect(config.GOOGLE_ACCESS_TOKEN).toBe("access-token");
      expect(config.GOOGLE_REFRESH_TOKEN).toBe("refresh-token");
    });
  });
});
