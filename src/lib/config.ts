import { Schema$ParameterFetcher } from "../types/lib/parameter-fetcher";

export class Config {
  private paramsFetcher!: Schema$ParameterFetcher;
  private static instance: Config;
  private constructor() {}

  GOOGLE_CLIENT_ID: string = "";
  GOOGLE_CLIENT_SECRET: string = "";
  GOOGLE_REDIRECT_URI: string = "";
  GOOGLE_ACCESS_TOKEN: string = "";
  GOOGLE_REFRESH_TOKEN: string = "";

  static getInstance() {
    if (!this.instance) {
      this.instance = new Config();
    }

    return this.instance;
  }

  /**
   * 初期化処理
   * 値を取得する前に必ず呼び出すこと
   */
  async init(paramsFetcher: Schema$ParameterFetcher) {
    this.paramsFetcher = paramsFetcher;

    const [
      google_client_id,
      google_client_secret,
      google_redirect_uri,
      google_access_token,
      refresh_token,
    ] = await Promise.all([
      this.envOrParameter("google-client-id"),
      this.envOrParameter("google-client-secret"),
      this.envOrParameter("google-redirect-uri"),
      this.envOrParameter("google-access-token"),
      this.envOrParameter("google-refresh-token"),
    ]);

    this.GOOGLE_CLIENT_ID = google_client_id;
    this.GOOGLE_CLIENT_SECRET = google_client_secret;
    this.GOOGLE_REDIRECT_URI = google_redirect_uri;
    this.GOOGLE_ACCESS_TOKEN = google_access_token;
    this.GOOGLE_REFRESH_TOKEN = refresh_token;
  }

  private async envOrParameter(name: string): Promise<string> {
    const envName = name.replace(/-/g, "_").toUpperCase();
    const envValue = process.env[envName];
    if (envValue) {
      return envValue;
    }

    return this.paramsFetcher.call(name);
  }
}
