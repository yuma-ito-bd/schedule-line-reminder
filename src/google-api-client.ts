import { OAuth2Client } from "google-auth-library";
import { Config } from "./lib/config";

export class GoogleApiClient {
  readonly authClient: OAuth2Client;

  constructor(token: { accessToken?: string; refreshToken: string }) {
    const config = Config.getInstance();
    this.authClient = new OAuth2Client({
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      redirectUri: config.GOOGLE_REDIRECT_URI,
    });

    this.authClient.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });
  }
}
