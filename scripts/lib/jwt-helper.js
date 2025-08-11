import * as jose from "jose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * LINE OAuth用のJWTを生成する
 * @returns {Promise<string>} 生成されたJWT
 */
export const makeJWT = async () => {
  const privateKeyJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "assertion-private.key"))
  );

  // JWKを適切にインポートしてKeyLikeオブジェクトを取得
  const privateKey = await jose.importJWK(privateKeyJson, "RS256");

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
