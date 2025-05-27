import { ApiResponseBuilder } from "../lib/api-response-builder";
import type { APIGatewayProxyResult } from "aws-lambda";
import { CalendarEventsUseCase } from "../usecases/calendar-events-usecase";
import { Config } from "../lib/config";
import { AwsParameterFetcher } from "../lib/aws-parameter-fetcher";

export const calendarEventsHandler =
  async (): Promise<APIGatewayProxyResult> => {
    const responseBuilder = new ApiResponseBuilder();
    console.info("Start calendar events handler");
    try {
      const config = Config.getInstance();
      const parameterFetcher = new AwsParameterFetcher();
      await config.init(parameterFetcher);

      await new CalendarEventsUseCase().execute();
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
