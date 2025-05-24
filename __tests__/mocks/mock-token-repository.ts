import type { Schema$TokenRepository } from "../../src/types/token-repository";

export class MockTokenRepository implements Schema$TokenRepository {
  async saveToken(token: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {}
  async getToken(userId: string): Promise<{
    userId: string;
    accessToken: string;
    refreshToken: string;
  } | null> {
    return null;
  }
  async updateToken(token: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {}
  async deleteToken(userId: string): Promise<void> {}
}
