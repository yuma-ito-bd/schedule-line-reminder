import type { Schema$GoogleAuth } from "../types/google-auth";
import type { Schema$OAuthStateRepository } from "../types/oauth-state-repository";
import type { Schema$TokenRepository } from "../types/token-repository";

export class OAuthCallbackUseCase {
  constructor(
    private readonly stateRepository: Schema$OAuthStateRepository,
    private readonly auth: Schema$GoogleAuth,
    private readonly tokenRepository: Schema$TokenRepository
  ) {}

  async execute(code?: string, state?: string): Promise<{ message: string }> {
    if (!code) {
      throw new Error("Authorization code is missing");
    }
    if (!state) {
      throw new Error("State parameter is missing");
    }

    // stateパラメータの検証
    const { isValid, userId } = await this.stateRepository.validateState(state);
    if (!isValid || !userId) {
      throw new Error("Invalid state parameter");
    }

    // Google認証の処理
    const tokens = await this.auth.getTokensFromCode(code);

    // トークンの保存
    await this.tokenRepository.saveToken({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return {
      message: "認証が完了しました。このウィンドウを閉じてください。",
    };
  }
}
