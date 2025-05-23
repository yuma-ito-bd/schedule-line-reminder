import type { Schema$GoogleAuth } from "../../src/types/google-auth";

export class MockGoogleAuth implements Schema$GoogleAuth {
  private authUrl = "https://example.com/auth";

  generateAuthUrl(): string {
    return this.authUrl;
  }
}
