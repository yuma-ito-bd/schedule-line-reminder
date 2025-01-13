import { Schema$ParameterFetcher } from "../types/lib/parameter-fetcher";

export class ParameterFetcher implements Schema$ParameterFetcher {
  private readonly AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN ?? "";
  private readonly PARAMETER_STORE_URL =
    "http://localhost:2773/systemsmanager/parameters/get";
  private readonly PARAMETER_NAME_PREFIX = "/schedule-line-reminder";

  async call(name: string): Promise<string> {
    const parameterKey = `${this.PARAMETER_NAME_PREFIX}/${name}`;

    // AWSパラメータストアのGet Parameter APIから値を取得する
    const queryParams = new URLSearchParams({
      name: encodeURIComponent(parameterKey),
      withDecryption: "true", // 暗号化されたパラメータを復号化する
    });
    const url = `${this.PARAMETER_STORE_URL}?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Aws-Parameters-Secrets-Token": this.AWS_SESSION_TOKEN,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.Parameter.Value ?? "";
    } else if (response.status === 400) {
      console.warn(`Parameter ${parameterKey} not found`);
      return "";
    } else {
      throw new Error("Failed to fetch parameter");
    }
  }
}
