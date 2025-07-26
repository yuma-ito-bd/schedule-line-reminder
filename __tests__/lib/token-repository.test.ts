import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import type {
  PutItemCommandInput,
  GetItemCommandInput,
  DeleteItemCommandInput,
  UpdateItemCommandInput,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { TokenRepository } from "../../src/lib/token-repository";
import { mockClient } from "aws-sdk-client-mock";

describe("TokenRepository", () => {
  let dynamoDBMock: ReturnType<typeof mockClient>;
  let repository: TokenRepository;

  beforeEach(() => {
    // 環境変数の設定
    process.env.STACK_NAME = "test-stack";
    // モックの初期化
    dynamoDBMock = mockClient(DynamoDBClient);
    // リポジトリの初期化
    repository = new TokenRepository(dynamoDBMock as unknown as DynamoDBClient);
  });

  describe("saveToken", () => {
    it("トークンを保存できること", async () => {
      // テストデータ
      const token = {
        userId: "test-user",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
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
      const input = call.args[0].input as PutItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
      expect(input.Item?.userId.S).toBe(token.userId);
      expect(input.Item?.accessToken.S).toBe(token.accessToken);
      expect(input.Item?.refreshToken.S).toBe(token.refreshToken);
      expect(input.Item?.createdAt.N).toBeDefined();
      expect(input.Item?.updatedAt.N).toBeDefined();
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
      };

      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: {
          userId: { S: token.userId },
          accessToken: { S: token.accessToken },
          refreshToken: { S: token.refreshToken },
          createdAt: { N: "1234567890" },
          updatedAt: { N: "1234567890" },
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
      const input = call.args[0].input as GetItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
      expect(input.Key?.userId.S).toBe(userId);
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
      };

      // モックの設定
      dynamoDBMock.on(UpdateItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.updateToken(token);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as UpdateItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
      expect(input.Key?.userId.S).toBe(token.userId);
      expect(input.UpdateExpression).toBe(
        "SET accessToken = :accessToken, updatedAt = :updatedAt, refreshToken = :refreshToken"
      );
      expect(input.ExpressionAttributeValues?.[":accessToken"].S).toBe(
        token.accessToken
      );
      expect(input.ExpressionAttributeValues?.[":refreshToken"].S).toBe(
        token.refreshToken
      );
      expect(input.ExpressionAttributeValues?.[":updatedAt"].N).toBeDefined();
    });

    it("refreshTokenがない場合でもトークンを更新できること", async () => {
      // テストデータ
      const token = {
        userId: "test-user",
        accessToken: "updated-access-token",
      };

      // モックの設定
      dynamoDBMock.on(UpdateItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.updateToken(token);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as UpdateItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
      expect(input.Key?.userId.S).toBe(token.userId);
      expect(input.UpdateExpression).toBe(
        "SET accessToken = :accessToken, updatedAt = :updatedAt"
      );
      expect(input.ExpressionAttributeValues?.[":accessToken"].S).toBe(
        token.accessToken
      );
      expect(
        input.ExpressionAttributeValues?.[":refreshToken"]
      ).toBeUndefined();
      expect(input.ExpressionAttributeValues?.[":updatedAt"].N).toBeDefined();
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
      const input = call.args[0].input as DeleteItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
      expect(input.Key?.userId.S).toBe(userId);
    });
  });

  describe("getAllTokens", () => {
    it("すべてのトークンを取得できること", async () => {
      // テストデータ
      const mockItems = [
        {
          userId: { S: "user1" },
          accessToken: { S: "access-token-1" },
          refreshToken: { S: "refresh-token-1" },
        },
        {
          userId: { S: "user2" },
          accessToken: { S: "access-token-2" },
          refreshToken: { S: "refresh-token-2" },
        },
      ];

      // モックの設定
      dynamoDBMock.on(ScanCommand).resolves({
        Items: mockItems,
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getAllTokens();

      // 結果の確認
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          userId: "user1",
          accessToken: "access-token-1",
          refreshToken: "refresh-token-1",
        },
        {
          userId: "user2",
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
        },
      ]);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as ScanCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-tokens");
    });

    it("トークンが存在しない場合は空配列を返すこと", async () => {
      // モックの設定
      dynamoDBMock.on(ScanCommand).resolves({
        Items: [],
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getAllTokens();

      // 結果の確認
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("DynamoDBでエラーが発生した場合、エラーをスローすること", async () => {
      // モックの設定
      const mockError = new Error("DynamoDB error");
      dynamoDBMock.on(ScanCommand).rejects(mockError);

      // テスト実行と検証
      await expect(repository.getAllTokens()).rejects.toThrow(mockError);
    });
  });
});
