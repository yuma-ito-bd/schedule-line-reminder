import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { TokenRepository } from "../../src/lib/token-repository";
import { mockClient } from "aws-sdk-client-mock";

describe("TokenRepository", () => {
  const dynamoDBMock = mockClient(DynamoDBClient);
  let repository: TokenRepository;

  beforeEach(() => {
    // 環境変数の設定
    process.env.STACK_NAME = "test-stack";
    // モックのリセット
    dynamoDBMock.reset();
    // リポジトリの初期化
    repository = new TokenRepository();
  });

  describe("saveToken", () => {
    it("トークンを保存できること", async () => {
      // テストデータ
      const token = {
        userId: "test-user",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      // モックの設定
      dynamoDBMock.on(PutItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.saveToken(token);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      expect(call.args[0].input).toEqual({
        TableName: "test-stack-oauth-tokens",
        Item: {
          userId: { S: token.userId },
          accessToken: { S: token.accessToken },
          refreshToken: { S: token.refreshToken },
          expiresAt: { N: token.expiresAt.toString() },
          createdAt: { N: token.createdAt.toString() },
          updatedAt: { N: token.updatedAt.toString() },
          ttl: { N: token.expiresAt.toString() },
        },
      });
    });
  });

  describe("getToken", () => {
    it("トークンを取得できること", async () => {
      // テストデータ
      const userId = "test-user";
      const token = {
        userId: "test-user",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: {
          userId: { S: token.userId },
          accessToken: { S: token.accessToken },
          refreshToken: { S: token.refreshToken },
          expiresAt: { N: token.expiresAt.toString() },
          createdAt: { N: token.createdAt.toString() },
          updatedAt: { N: token.updatedAt.toString() },
        },
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getToken(userId);

      // 結果の確認
      expect(result).toEqual(token);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      expect(call.args[0].input).toEqual({
        TableName: "test-stack-oauth-tokens",
        Key: {
          userId: { S: userId },
        },
      });
    });

    it("トークンが存在しない場合はnullを返すこと", async () => {
      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: undefined,
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getToken("non-existent-user");

      // 結果の確認
      expect(result).toBeNull();
    });
  });

  describe("updateToken", () => {
    it("トークンを更新できること", async () => {
      // テストデータ
      const token = {
        userId: "test-user",
        accessToken: "updated-access-token",
        refreshToken: "updated-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      // モックの設定
      dynamoDBMock.on(PutItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.updateToken(token);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      expect(call.args[0].input).toEqual({
        TableName: "test-stack-oauth-tokens",
        Item: {
          userId: { S: token.userId },
          accessToken: { S: token.accessToken },
          refreshToken: { S: token.refreshToken },
          expiresAt: { N: token.expiresAt.toString() },
          createdAt: { N: token.createdAt.toString() },
          updatedAt: { N: token.updatedAt.toString() },
          ttl: { N: token.expiresAt.toString() },
        },
      });
    });
  });

  describe("deleteToken", () => {
    it("トークンを削除できること", async () => {
      // テストデータ
      const userId = "test-user";

      // モックの設定
      dynamoDBMock.on(DeleteItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.deleteToken(userId);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      expect(call.args[0].input).toEqual({
        TableName: "test-stack-oauth-tokens",
        Key: {
          userId: { S: userId },
        },
      });
    });
  });
});
