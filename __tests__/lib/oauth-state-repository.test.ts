import { describe, it, expect, beforeEach } from "bun:test";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { PutItemCommandInput } from "@aws-sdk/client-dynamodb";
import { OAuthStateRepository } from "../../src/lib/oauth-state-repository";
import { Config } from "../../src/lib/config";
import { ParameterFetcherMock } from "../../src/lib/parameter-fetcher-mock";
import { mockClient } from "aws-sdk-client-mock";

describe("OAuthStateRepository", () => {
  let dynamoDBMock: ReturnType<typeof mockClient>;
  let repository: OAuthStateRepository;

  beforeEach(async () => {
    // Configの初期化
    const parameterFetcher = new ParameterFetcherMock();
    await Config.getInstance().init(parameterFetcher);

    // 環境変数の設定
    process.env.STACK_NAME = "test-stack";
    // モックの初期化
    dynamoDBMock = mockClient(DynamoDBClient);
    // リポジトリの初期化
    repository = new OAuthStateRepository(300, dynamoDBMock as unknown as DynamoDBClient);
  });

  describe("saveState", () => {
    it("stateパラメータとuserIdを保存できること", async () => {
      // Given
      const state = "test-state";
      const userId = "test-user-id";

      // モックの設定
      dynamoDBMock.on(PutItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // When
      await repository.saveState(state, userId);

      // Then
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as PutItemCommandInput;
      expect(input.TableName).toBe("test-stack-oauth-state");
      expect(input.Item?.state.S).toBe(state);
      expect(input.Item?.userId.S).toBe(userId);
      expect(Number(input.Item?.ttl.N)).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      );
    });

    it("同じstateが存在する場合はエラーをスローすること", async () => {
      // Given
      const state = "test-state";
      const userId = "test-user-id";
      const error = new Error("ConditionalCheckFailedException");
      dynamoDBMock.on(PutItemCommand).rejects(error);

      // When & Then
      expect(repository.saveState(state, userId)).rejects.toThrow(
        "ConditionalCheckFailedException"
      );
    });
  });

  describe("validateState", () => {
    it("有効なstateパラメータの場合、trueとuserIdを返すこと", async () => {
      // Given
      const state = "test-state";
      const userId = "test-user-id";

      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: {
          state: { S: state },
          userId: { S: userId },
        },
        $metadata: {
          httpStatusCode: 200,
        },
      });
      dynamoDBMock.on(DeleteItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: true,
        userId,
      });
      expect(dynamoDBMock.calls()).toHaveLength(2);
    });

    it("無効なstateパラメータの場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";

      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: {
          state: { S: "different-state" },
          userId: { S: "test-user-id" },
        },
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
        userId: "test-user-id",
      });
      expect(dynamoDBMock.calls()).toHaveLength(1);
    });

    it("stateパラメータが存在しない場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";

      // モックの設定
      dynamoDBMock.on(GetItemCommand).resolves({
        Item: undefined,
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
      });
      expect(dynamoDBMock.calls()).toHaveLength(1);
    });

    it("DynamoDBのエラーの場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";
      const error = new Error("DynamoDB error");

      // モックの設定
      dynamoDBMock.on(GetItemCommand).rejects(error);

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
      });
      expect(dynamoDBMock.calls()).toHaveLength(1);
    });
  });
});
