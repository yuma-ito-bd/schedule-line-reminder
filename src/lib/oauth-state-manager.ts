import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { Schema$OAuthStateManager } from "../types/oauth-state-manager";

/**
 * OAuth stateパラメータを管理するクラス
 */
export class OAuthStateManager implements Schema$OAuthStateManager {
  private readonly dynamoClient: DynamoDBClient;
  private readonly tableName: string;
  private readonly ttlSeconds: number;

  constructor(tableName: string, ttlSeconds: number = 300) {
    this.dynamoClient = new DynamoDBClient({});
    this.tableName = tableName;
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * stateパラメータを保存する
   * @param state 保存するstateパラメータ
   * @param userId ユーザーID
   */
  async saveState(state: string, userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        state,
        userId,
        ttl: now + this.ttlSeconds,
      }),
      // 条件付き書き込み：同じstateが存在しない場合のみ保存
      ConditionExpression: "attribute_not_exists(state)",
    });
    await this.dynamoClient.send(command);
  }

  /**
   * stateパラメータを検証する
   * @param state 検証するstateパラメータ
   * @returns 検証結果とユーザーID
   */
  async validateState(
    state: string
  ): Promise<{ isValid: boolean; userId?: string }> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ state }),
      });
      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return { isValid: false };
      }

      const item = unmarshall(response.Item);
      const isValid = item.state === state;

      // 検証後はstateを削除（一度きりの使用）
      if (isValid) {
        await this.deleteState(state);
      }

      return {
        isValid,
        userId: item.userId,
      };
    } catch (error) {
      console.error("Failed to validate state:", error);
      return { isValid: false };
    }
  }

  /**
   * stateパラメータを削除する
   */
  private async deleteState(state: string): Promise<void> {
    try {
      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ state }),
      });
      await this.dynamoClient.send(command);
    } catch (error) {
      console.error("Failed to delete state:", error);
    }
  }
}
