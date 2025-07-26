import { describe, it, expect, mock } from "bun:test";
import { AwsParameterFetcher } from "../../src/lib/aws-parameter-fetcher";

describe("AwsParameterFetcher", () => {
  it("正しいURLにリクエストを送信すること", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: true,
      json: async () => ({ Parameter: { Value: "value" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const parameterName = "test";
    await new AwsParameterFetcher().call(parameterName);

    const queryParams = new URLSearchParams({
      name: encodeURIComponent(`/schedule-line-reminder/${parameterName}`),
      withDecryption: "true",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:2773/systemsmanager/parameters/get?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "X-Aws-Parameters-Secrets-Token": "",
        },
      }
    );
  });

  it("パラメータを取得できた場合に値を返すこと", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Parameter: { Value: "value" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await new AwsParameterFetcher().call("test");

    expect(result).toBe("value");
  });

  it("パラメータが存在しなかった場合は空文字を返すこと", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: false,
      status: 400,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await new AwsParameterFetcher().call("test");

    expect(result).toBe("");
  });

  it("パラメータの取得で500エラーになった場合、エラーを吐くこと", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const fetcher = new AwsParameterFetcher();
    expect(fetcher.call("test")).rejects.toThrow("Failed to fetch parameter");
  });
});
