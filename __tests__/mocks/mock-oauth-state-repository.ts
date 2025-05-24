import type { Schema$OAuthStateRepository } from "../../src/types/oauth-state-repository";

/**
 * OAuthStateRepositoryのモッククラス
 */
export class MockOAuthStateRepository implements Schema$OAuthStateRepository {
  async saveState(_state: string, _userId: string): Promise<void> {}
  async validateState(
    _state: string
  ): Promise<{ isValid: boolean; userId?: string }> {
    return { isValid: true };
  }
}
