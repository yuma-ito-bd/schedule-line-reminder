import { ParameterFetcherMock } from "./parameter-fetcher-mock";
import type { Schema$ParameterFetcher } from "../types/lib/parameter-fetcher";
import { AwsParameterFetcher } from "./aws-parameter-fetcher";

export class Config {
  private paramsFetcher!: Schema$ParameterFetcher;
  private static instance: Config;
  private constructor() {}

  GOOGLE_CLIENT_ID: string = "";
  GOOGLE_CLIENT_SECRET: string = "";
  GOOGLE_REDIRECT_URI: string = "";
  LINE_CHANNEL_ACCESS_TOKEN: string = "";
  LINE_CHANNEL_SECRET: string = "";

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
  async init(paramsFetcher?: Schema$ParameterFetcher) {
    if (paramsFetcher) {
      this.paramsFetcher = paramsFetcher;
    } else {
      this.paramsFetcher =
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? new ParameterFetcherMock()
          : new AwsParameterFetcher();
    }

    const [
      google_client_id,
      google_client_secret,
      google_redirect_uri,
      line_channel_access_token,
      line_channel_secret,
    ] = await Promise.all([
      this.envOrParameter("google-client-id"),
      this.envOrParameter("google-client-secret"),
      this.envOrParameter("google-redirect-uri"),
      this.envOrParameter("line-channel-access-token"),
      this.envOrParameter("line-channel-secret"),
    ]);

    this.GOOGLE_CLIENT_ID = google_client_id;
    this.GOOGLE_CLIENT_SECRET = google_client_secret;
    this.GOOGLE_REDIRECT_URI = google_redirect_uri;
    this.LINE_CHANNEL_ACCESS_TOKEN = line_channel_access_token;
    this.LINE_CHANNEL_SECRET = line_channel_secret;
    this.logInitialization();
  }

  private async envOrParameter(name: string): Promise<string> {
    const envName = name.replace(/-/g, "_").toUpperCase();
    const envValue = process.env[envName];
    if (envValue) {
      return envValue;
    }

    return this.paramsFetcher.call(name);
  }

  /**
   * 設定初期化時のログ出力（ParameterFetcherのクラス名付き）
   */
  private logInitialization() {
    const fetcherClass = this.paramsFetcher.constructor?.name || typeof this.paramsFetcher;
    console.info(`Configuration initialized. ParameterFetcher: ${fetcherClass}`);
  }
}
