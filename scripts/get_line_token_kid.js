import * as jose from "jose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const makeJWT = async () => {
  const privateKey = JSON.parse(
    fs.readFileSync(path.join(__dirname, "assertion-private.key"))
  );

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: process.env.KID, // チャネル基本設定＞アサーション署名キー
  };

  const payload = {
    iss: process.env.CHANNEL_ID, // チャネルID
    sub: process.env.CHANNEL_ID, // チャネルID
    aud: "https://api.line.me/",
    exp: Math.floor(new Date().getTime() / 1000) + 60 * 25, // JWTの有効期間（UNIX時間）
    token_exp: 60 * 60 * 24 * 30, // チャネルアクセストークンの有効期間
  };

  // JWTの生成
  return new jose.SignJWT(payload).setProtectedHeader(header).sign(privateKey);
};

const getTokenKid = async (jwt) => {
  const tokenKidUrl = "https://api.line.me/oauth2/v2.1/tokens/kid";
  
  // URLSearchParamsを使用してクエリパラメータを構築
  const params = new URLSearchParams({
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: jwt,
  });

  // GETリクエストでクエリパラメータを送信
  const response = await fetch(`${tokenKidUrl}?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response;
};

(async () => {
  try {
    const jwt = await makeJWT();
    console.log("Generated JWT:", jwt);
    
    const tokenKidResponse = await getTokenKid(jwt);
    console.log("Response status:", tokenKidResponse.status);
    console.log("Response headers:", Object.fromEntries(tokenKidResponse.headers.entries()));
    
    if (tokenKidResponse.ok) {
      const responseData = await tokenKidResponse.json();
      console.log("Response data:", responseData);
    } else {
      const errorText = await tokenKidResponse.text();
      console.error("Error response:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
})();
