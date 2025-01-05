import { OAuth2Client } from "google-auth-library";

export class GoogleApiClient {
  readonly authClient: OAuth2Client;

  constructor(token: { accessToken?: string; refreshToken: string }) {
    this.authClient = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    this.authClient.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
  }
}
