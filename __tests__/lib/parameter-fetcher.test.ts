import { describe, it, expect, mock } from "bun:test";
import { fetchParameter } from "../../src/lib/parameter-fetcher";

describe("fetchParameter", () => {
  it.only("正しいURLにリクエストを送信すること", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: true,
      json: async () => ({ Parameter: { Value: "value" } }),
    });
    global.fetch = fetchMock;

    const parameterName = "test";
    console.log("call fetchParameter");
    await fetchParameter(parameterName);

    const queryParams = new URLSearchParams({
      name: encodeURIComponent(`/schedule-line-reminder/${parameterName}`),
      withDecryption: "true",
    });
    console.log({ mock: fetchMock.mock });
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
    global.fetch = fetchMock;

    const result = await fetchParameter("test");

    expect(result).toBe("value");
  });

  it("パラメータが存在しなかった場合は空文字を返すこと", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: false,
      status: 400,
    });
    global.fetch = fetchMock;

    const result = await fetchParameter("test");

    expect(result).toBe("");
  });

  it("パラメータの取得で500エラーになった場合、エラーを吐くこと", async () => {
    const fetchMock = mock().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = fetchMock;

    expect(fetchParameter("test")).rejects.toThrow("Failed to fetch parameter");
  });
});
