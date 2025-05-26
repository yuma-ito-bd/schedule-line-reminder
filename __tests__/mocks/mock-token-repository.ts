import type {
  Schema$TokenRepository,
  Token,
  UpdateToken,
} from "../../src/types/token-repository";

export class MockTokenRepository implements Schema$TokenRepository {
  async saveToken(token: Token): Promise<void> {}
  async getToken(userId: string): Promise<Token | null> {
    return null;
  }
  async updateToken(token: UpdateToken): Promise<void> {}
  async deleteToken(userId: string): Promise<void> {}
}
