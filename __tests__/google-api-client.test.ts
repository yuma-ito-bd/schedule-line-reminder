import { describe, it, expect } from "bun:test";
import { GoogleApiClient } from "../src/google-api-client";
import { OAuth2Client } from "google-auth-library";

describe("GoogleApiClient", () => {
  describe("authClient", () => {
    it("OAth2Clientであること", () => {
      const refreshToken = "refresh_token";
      const googleApiClient = new GoogleApiClient({ refreshToken });
      expect(googleApiClient.authClient).toBeInstanceOf(OAuth2Client);
    });

    it("正しく初期化されていること", () => {
      const accessToken = "access_token";
      const refreshToken = "refresh_token";
      const googleApiClient = new GoogleApiClient({
        accessToken,
        refreshToken,
      });
      const authClient = googleApiClient.authClient;
      expect(authClient.credentials.access_token).toBe(accessToken);
      expect(authClient.credentials.refresh_token).toBe(refreshToken);
    });
  });
});
