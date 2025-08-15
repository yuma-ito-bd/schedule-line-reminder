import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type {
  Schema$UserCalendarRepository,
  UserCalendar,
  CreateUserCalendar,
} from "../types/user-calendar-repository";

/**
 * ユーザーカレンダーを管理するリポジトリ
 */
export class UserCalendarRepository implements Schema$UserCalendarRepository {
  private readonly dynamoClient: DynamoDBClient;
  private readonly tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.dynamoClient = dynamoClient || new DynamoDBClient({});
    this.tableName = process.env.USER_CALENDARS_TABLE || `${process.env.STACK_NAME}-UserCalendars`;
  }

  /**
   * ユーザーにカレンダーを追加する
   * @param calendar 追加するカレンダー情報
   */
  async addCalendar(calendar: CreateUserCalendar): Promise<void> {
    const now = new Date();
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...calendar,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    });
    await this.dynamoClient.send(command);
  }

  /**
   * ユーザーからカレンダーを削除する
   * @param userId ユーザーID
   * @param calendarId カレンダーID
   */
  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: marshall({
        userId,
        calendarId,
      }),
    });
    await this.dynamoClient.send(command);
  }

  /**
   * ユーザーの購読カレンダー一覧を取得する
   * @param userId ユーザーID
   * @returns ユーザーの購読カレンダー一覧
   */
  async getUserCalendars(userId: string): Promise<UserCalendar[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: marshall({
        ":userId": userId,
      }),
    });

    const result = await this.dynamoClient.send(command);
    
    if (!result.Items) {
      return [];
    }

    return result.Items.map((item) => {
      const unmarshalled = unmarshall(item);
      return {
        ...unmarshalled,
        createdAt: new Date(unmarshalled.createdAt),
        updatedAt: new Date(unmarshalled.updatedAt),
      } as UserCalendar;
    });
  }
}