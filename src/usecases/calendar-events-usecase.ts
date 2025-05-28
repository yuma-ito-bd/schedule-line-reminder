import { CalendarEventsNotifier } from "../calendar-events-notifier";
import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import type { Schema$LineMessagingApiClient } from "../types/line-messaging-api-adapter";
import type { Schema$TokenRepository, Token } from "../types/token-repository";

export class CalendarEventsUseCase {
  constructor(
    private readonly tokenRepository: Schema$TokenRepository,
    private readonly lineMessagingApiClient: Schema$LineMessagingApiClient
  ) {}

  async execute(): Promise<void> {
    const tokens = await this.tokenRepository.getAllTokens();

    await Promise.all(tokens.map((token) => this.processUserToken(token)));
  }

  private async processUserToken(token: Token): Promise<void> {
    try {
      const auth = new GoogleAuthAdapter();
      auth.setTokens({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      });
      const googleCalendarApi = new GoogleCalendarApiAdapter(auth);
      await new CalendarEventsNotifier(
        googleCalendarApi,
        this.lineMessagingApiClient
      ).call();
    } catch (error) {
      console.error(
        `Error processing calendar for user ${token.userId}:`,
        error
      );
    }
  }
}
