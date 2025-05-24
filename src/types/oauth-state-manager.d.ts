export interface Schema$OAuthStateManager {
  /**
   * stateパラメータを保存する
   * @param state 保存するstateパラメータ
   * @param userId ユーザーID
   */
  saveState(state: string, userId: string): Promise<void>;

  /**
   * stateパラメータを検証する
   * @param state 検証するstateパラメータ
   * @returns 検証結果とユーザーID
   */
  validateState(state: string): Promise<{ isValid: boolean; userId?: string }>;
}
