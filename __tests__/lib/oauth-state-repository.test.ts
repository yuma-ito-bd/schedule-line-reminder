import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OAuthStateRepository } from "../../src/lib/oauth-state-repository";
import { Config } from "../../src/lib/config";
import { ParameterFetcherMock } from "../../src/lib/parameter-fetcher-mock";

// DynamoDBClientのモック
type MockDynamoDBCommand = {
  input: {
    TableName: string;
    Item?: {
      state: { S: string };
      userId: { S: string };
      ttl: { N: string };
    };
    Key?: {
      state: { S: string };
    };
  };
};

const mockDynamoClient = {
  send: mock((command: MockDynamoDBCommand) => Promise.resolve({})),
};

// DynamoDBClientのコンストラクタをモック
mock.module("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: mock(() => mockDynamoClient),
}));

describe("OAuthStateRepository", () => {
  let repository: OAuthStateRepository;

  beforeEach(async () => {
    // Configの初期化
    const parameterFetcher = new ParameterFetcherMock();
    await Config.getInstance().init(parameterFetcher);

    // リポジトリのインスタンス化
    repository = new OAuthStateRepository();
    mockDynamoClient.send.mockClear();
  });

  describe("saveState", () => {
    it("stateパラメータとuserIdを保存できること", async () => {
      // Given
      const state = "test-state";
      const userId = "test-user-id";
      const mockResponse = {};
      mockDynamoClient.send.mockResolvedValueOnce(mockResponse);

      // When
      await repository.saveState(state, userId);

      // Then
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      const calls = mockDynamoClient.send.mock.calls;
      expect(calls.length).toBe(1);
      const command = calls[0][0] as MockDynamoDBCommand;
      expect(command.input.TableName).toBe(
        `${process.env.STACK_NAME}-oauth-state`
      );
      expect(command.input.Item?.state.S).toBe(state);
      expect(command.input.Item?.userId.S).toBe(userId);
      expect(Number(command.input.Item?.ttl.N)).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      );
    });

    it("同じstateが存在する場合はエラーをスローすること", async () => {
      // Given
      const state = "test-state";
      const userId = "test-user-id";
      const error = new Error("ConditionalCheckFailedException");
      mockDynamoClient.send.mockRejectedValueOnce(error);

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
      const mockResponse = {
        Item: {
          state: { S: state },
          userId: { S: userId },
        },
      };
      mockDynamoClient.send.mockResolvedValueOnce(mockResponse);
      mockDynamoClient.send.mockResolvedValueOnce({}); // deleteStateの呼び出し

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: true,
        userId,
      });
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it("無効なstateパラメータの場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";
      const mockResponse = {
        Item: {
          state: { S: "different-state" },
          userId: { S: "test-user-id" },
        },
      };
      mockDynamoClient.send.mockResolvedValueOnce(mockResponse);

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
        userId: "test-user-id",
      });
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it("stateパラメータが存在しない場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";
      const mockResponse = {};
      mockDynamoClient.send.mockResolvedValueOnce(mockResponse);

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
      });
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    it("DynamoDBのエラーの場合、falseを返すこと", async () => {
      // Given
      const state = "test-state";
      const error = new Error("DynamoDB error");
      mockDynamoClient.send.mockRejectedValueOnce(error);

      // When
      const result = await repository.validateState(state);

      // Then
      expect(result).toEqual({
        isValid: false,
      });
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });
  });
});
