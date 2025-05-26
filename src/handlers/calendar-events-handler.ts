import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";
import { LineMessagingApiClient } from "../line-messaging-api-client";
import { ApiResponseBuilder } from "../lib/api-response-builder";
import type { APIGatewayProxyResult } from "aws-lambda";

export const calendarEventsHandler =
  async (): Promise<APIGatewayProxyResult> => {
    const responseBuilder = new ApiResponseBuilder();
    console.info("Start calendar events handler");
    try {
      const config = Config.getInstance();
      const parameterFetcher = new AwsParameterFetcher();
      await config.init(parameterFetcher);

      const auth = new GoogleAuthAdapter();
      const token = {
        accessToken: config.GOOGLE_ACCESS_TOKEN,
        refreshToken: config.GOOGLE_REFRESH_TOKEN,
      };
      auth.setTokens(token);
      const googleCalendarApi = new GoogleCalendarApiAdapter(auth);
      const lineMessagingApiClient = new LineMessagingApiClient();

      await new CalendarEventsNotifier(
        googleCalendarApi,
        lineMessagingApiClient
      ).call();
      console.info("End calendar events handler");

      return responseBuilder.success(
        "カレンダーイベントの通知処理が完了しました"
      );
    } catch (error) {
      console.error("Error in calendar events handler:", error);
      return responseBuilder.error(
        "カレンダーイベントの通知処理中にエラーが発生しました"
      );
    }
  };
