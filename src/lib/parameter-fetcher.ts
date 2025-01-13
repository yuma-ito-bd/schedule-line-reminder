export const fetchParameter = async (name: string): Promise<string> => {
  const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN ?? "";
  const PARAMETER_STORE_URL =
    "http://localhost:2773/systemsmanager/parameters/get";
  const PARAMETER_NAME_PREFIX = "/schedule-line-reminder";
  const parameterKey = `${PARAMETER_NAME_PREFIX}/${name}`;

  // AWSパラメータストアのGet Parameter APIから値を取得する
  const queryParams = new URLSearchParams({
    name: encodeURIComponent(parameterKey),
    withDecryption: "true", // 暗号化されたパラメータを復号化する
  });
  const url = `${PARAMETER_STORE_URL}?${queryParams.toString()}`;
  console.log("fetch called", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Aws-Parameters-Secrets-Token": AWS_SESSION_TOKEN,
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
};

console.log("fetchParameter loaded");
