import type {
  Schema$GoogleAuth,
  Schema$GoogleAuthToken,
} from "../../src/types/google-auth";
import { OAuth2Client } from "google-auth-library";

export class MockGoogleAuth implements Schema$GoogleAuth {
  private authUrl = "https://example.com/auth";
  private readonly oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client();
  }

  generateAuthUrl(): { url: string; state: string } {
    return {
      url: this.authUrl,
      state: "mock-state",
    };
  }

  getAuthClient(): OAuth2Client {
    return this.oauth2Client;
  }

  setTokens(_token: Schema$GoogleAuthToken): void {
    // モックなので何もしない
  }

  async getTokensFromCode(_code: string): Promise<Schema$GoogleAuthToken> {
    return {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };
  }
}
