import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { Schema$TokenRepository, Token } from "../types/token-repository";

/**
 * OAuthトークンを管理するリポジトリ
 */
export class TokenRepository implements Schema$TokenRepository {
  private readonly dynamoClient: DynamoDBClient;
  private readonly tableName: string;
  private readonly ttlSeconds: number;

  constructor(ttlSeconds: number = 3600) {
    this.dynamoClient = new DynamoDBClient({});
    this.tableName = `${process.env.STACK_NAME}-oauth-tokens`;
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * トークンを保存する
   * @param token 保存するトークン
   */
  async saveToken(token: Token): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...token,
        ttl: now + this.ttlSeconds,
        createdAt: now,
        updatedAt: now,
      }),
    });
    await this.dynamoClient.send(command);
  }

  /**
   * ユーザーIDに紐づくトークンを取得する
   * @param userId ユーザーID
   * @returns トークン（存在しない場合はnull）
   */
  async getToken(userId: string): Promise<Token | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ userId }),
      });
      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        return null;
      }

      const item = unmarshall(response.Item);
      return {
        userId: item.userId,
        accessToken: item.accessToken,
        refreshToken: item.refreshToken,
      };
    } catch (error) {
      console.error("Failed to get token:", error);
      return null;
    }
  }

  /**
   * トークンを更新する
   * @param token 更新するトークン
   */
  async updateToken(token: Token): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...token,
        ttl: now + this.ttlSeconds,
        updatedAt: now,
      }),
    });
    await this.dynamoClient.send(command);
  }

  /**
   * トークンを削除する
   * @param userId ユーザーID
   */
  async deleteToken(userId: string): Promise<void> {
    try {
      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ userId }),
      });
      await this.dynamoClient.send(command);
    } catch (error) {
      console.error("Failed to delete token:", error);
    }
  }
}
