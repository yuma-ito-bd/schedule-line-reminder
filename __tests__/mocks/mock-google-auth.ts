import type { Schema$GoogleAuth } from "../../src/types/google-auth";
import { OAuth2Client } from "google-auth-library";

export class MockGoogleAuth implements Schema$GoogleAuth {
  private authUrl = "https://example.com/auth";
  private readonly oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client();
  }

  generateAuthUrl(): string {
    return this.authUrl;
  }

  getAuthClient(): OAuth2Client {
    return this.oauth2Client;
  }
}
