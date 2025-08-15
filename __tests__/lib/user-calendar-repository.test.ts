import { describe, it, expect, beforeEach } from "bun:test";
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import type {
  PutItemCommandInput,
  DeleteItemCommandInput,
  QueryCommandInput,
} from "@aws-sdk/client-dynamodb";
import { UserCalendarRepository } from "../../src/lib/user-calendar-repository";
import { mockClient } from "aws-sdk-client-mock";

describe("UserCalendarRepository", () => {
  let dynamoDBMock: ReturnType<typeof mockClient>;
  let repository: UserCalendarRepository;

  beforeEach(() => {
    // 環境変数の設定
    process.env.STACK_NAME = "test-stack";
    process.env.USER_CALENDARS_TABLE = "test-stack-UserCalendars";
    // モックの初期化
    dynamoDBMock = mockClient(DynamoDBClient);
    dynamoDBMock.reset();
    // リポジトリの初期化
    repository = new UserCalendarRepository(dynamoDBMock as unknown as DynamoDBClient);
  });

  describe("addCalendar", () => {
    it("カレンダーを追加できること", async () => {
      // テストデータ
      const calendar = {
        userId: "test-user",
        calendarId: "test-calendar-id",
        calendarName: "テストカレンダー",
      };

      // モックの設定
      dynamoDBMock.on(PutItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.addCalendar(calendar);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as PutItemCommandInput;
      expect(input.TableName).toBe("test-stack-UserCalendars");
      expect(input.Item?.userId.S).toBe(calendar.userId);
      expect(input.Item?.calendarId.S).toBe(calendar.calendarId);
      expect(input.Item?.calendarName.S).toBe(calendar.calendarName);
      expect(input.Item?.createdAt.N).toBeDefined();
      expect(input.Item?.updatedAt.N).toBeDefined();
      
      // 数値（エポックミリ秒）が設定されていることを確認
      const createdAt = Number(input.Item?.createdAt.N);
      const updatedAt = Number(input.Item?.updatedAt.N);
      expect(Number.isFinite(createdAt)).toBe(true);
      expect(Number.isFinite(updatedAt)).toBe(true);
      // 現在時刻±5分の範囲にあること
      const now = Date.now();
      expect(createdAt).toBeGreaterThan(now - 5 * 60 * 1000);
      expect(createdAt).toBeLessThanOrEqual(now + 5 * 60 * 1000);
      expect(updatedAt).toBeGreaterThan(now - 5 * 60 * 1000);
      expect(updatedAt).toBeLessThanOrEqual(now + 5 * 60 * 1000);
    });

    it("環境変数が設定されていない場合はSTACK_NAMEから推定すること", async () => {
      // 環境変数を削除
      delete process.env.USER_CALENDARS_TABLE;
      
      // 新しいリポジトリインスタンスを作成
      const newRepository = new UserCalendarRepository(dynamoDBMock as unknown as DynamoDBClient);

      const calendar = {
        userId: "test-user",
        calendarId: "test-calendar-id",
        calendarName: "テストカレンダー",
      };

      dynamoDBMock.on(PutItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      await newRepository.addCalendar(calendar);

      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as PutItemCommandInput;
      expect(input.TableName).toBe("test-stack-UserCalendars");
    });
  });

  describe("deleteCalendar", () => {
    it("カレンダーを削除できること", async () => {
      // テストデータ
      const userId = "test-user";
      const calendarId = "test-calendar-id";

      // モックの設定
      dynamoDBMock.on(DeleteItemCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      await repository.deleteCalendar(userId, calendarId);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as DeleteItemCommandInput;
      expect(input.TableName).toBe("test-stack-UserCalendars");
      expect(input.Key?.userId.S).toBe(userId);
      expect(input.Key?.calendarId.S).toBe(calendarId);
    });
  });

  describe("getUserCalendars", () => {
    it("ユーザーのカレンダー一覧を取得できること", async () => {
      // テストデータ
      const userId = "test-user";
      const mockCalendars = [
        {
          userId: { S: "test-user" },
          calendarId: { S: "calendar-1" },
          calendarName: { S: "カレンダー1" },
          createdAt: { N: String(new Date("2023-01-01T00:00:00.000Z").getTime()) },
          updatedAt: { N: String(new Date("2023-01-01T00:00:00.000Z").getTime()) },
        },
        {
          userId: { S: "test-user" },
          calendarId: { S: "calendar-2" },
          calendarName: { S: "カレンダー2" },
          createdAt: { N: String(new Date("2023-01-02T00:00:00.000Z").getTime()) },
          updatedAt: { N: String(new Date("2023-01-02T00:00:00.000Z").getTime()) },
        },
      ];

      // モックの設定
      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockCalendars,
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getUserCalendars(userId);

      // 結果の確認
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: "test-user",
        calendarId: "calendar-1",
        calendarName: "カレンダー1",
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2023-01-01T00:00:00.000Z"),
      });
      expect(result[1]).toEqual({
        userId: "test-user",
        calendarId: "calendar-2",
        calendarName: "カレンダー2",
        createdAt: new Date("2023-01-02T00:00:00.000Z"),
        updatedAt: new Date("2023-01-02T00:00:00.000Z"),
      });

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as QueryCommandInput;
      expect(input.TableName).toBe("test-stack-UserCalendars");
      expect(input.KeyConditionExpression).toBe("userId = :userId");
      expect(input.ExpressionAttributeValues?.[":userId"].S).toBe(userId);
    });

    it("カレンダーが存在しない場合は空の配列を返すこと", async () => {
      // テストデータ
      const userId = "test-user";

      // モックの設定（Itemsがundefined）
      dynamoDBMock.on(QueryCommand).resolves({
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getUserCalendars(userId);

      // 結果の確認
      expect(result).toEqual([]);

      // モックの呼び出し確認
      expect(dynamoDBMock.calls()).toHaveLength(1);
      const call = dynamoDBMock.calls()[0];
      const input = call.args[0].input as QueryCommandInput;
      expect(input.TableName).toBe("test-stack-UserCalendars");
      expect(input.KeyConditionExpression).toBe("userId = :userId");
      expect(input.ExpressionAttributeValues?.[":userId"].S).toBe(userId);
    });

    it("カレンダーが空の配列の場合は空の配列を返すこと", async () => {
      // テストデータ
      const userId = "test-user";

      // モックの設定（空の配列）
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getUserCalendars(userId);

      // 結果の確認
      expect(result).toEqual([]);
    });

    it("Date型の変換が正しく行われること", async () => {
      // テストデータ
      const userId = "test-user";
      const testDate = new Date("2023-12-25T09:30:00.000Z").getTime();
      const mockCalendars = [
        {
          userId: { S: "test-user" },
          calendarId: { S: "calendar-1" },
          calendarName: { S: "テストカレンダー" },
          createdAt: { N: String(testDate) },
          updatedAt: { N: String(testDate) },
        },
      ];

      // モックの設定
      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockCalendars,
        $metadata: {
          httpStatusCode: 200,
        },
      });

      // テスト実行
      const result = await repository.getUserCalendars(userId);

      // Date型の確認
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.getTime()).toBe(testDate);
      expect(result[0].updatedAt.getTime()).toBe(testDate);
    });
  });
});