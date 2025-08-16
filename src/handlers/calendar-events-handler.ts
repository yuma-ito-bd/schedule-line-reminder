import { ApiResponseBuilder } from "../lib/api-response-builder";
import type { APIGatewayProxyResult } from "aws-lambda";
import { CalendarEventsUseCase } from "../usecases/calendar-events-usecase";
import { Config } from "../lib/config";
import { TokenRepository } from "../lib/token-repository";
import { LineMessagingApiClient } from "../line-messaging-api-client";
import { UserCalendarRepository } from "../lib/user-calendar-repository";

const configInitialization = (Config.getInstance()).init();

export const calendarEventsHandler =
  async (): Promise<APIGatewayProxyResult> => {
    await configInitialization;
    const responseBuilder = new ApiResponseBuilder();
    console.info("Start calendar events handler");
    try {
      const tokenRepository = new TokenRepository();
      const lineMessagingApiClient = new LineMessagingApiClient();
      const userCalendarRepository = new UserCalendarRepository();
      await new CalendarEventsUseCase(
        tokenRepository,
        lineMessagingApiClient,
        userCalendarRepository
      ).execute();
      console.info("End calendar events handler");

      return responseBuilder.success(
        "カレンダーイベントの通知処理が完了しました"
      );
    } catch (error) {
      console.error("Error in calendar events handler:", error);
      return responseBuilder.serverError(
        "カレンダーイベントの通知処理中にエラーが発生しました"
      );
    }
  };
