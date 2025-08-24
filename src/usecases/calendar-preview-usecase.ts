import { GoogleCalendarApiAdapter } from "../google-calendar-api-adapter";
import { CalendarMessageBuilder } from "../calendar-message-builder";
import { GoogleAuthAdapter } from "../lib/google-auth-adapter";
import type { Schema$TokenRepository } from "../types/token-repository";
import type { Schema$UserCalendarRepository } from "../types/user-calendar-repository";
import type { Schema$GoogleCalendarApiAdapter, Schema$CalendarEvent } from "../types/google-calendar-api-adapter";

export class CalendarPreviewUseCase {
	constructor(
		private readonly tokenRepository: Schema$TokenRepository,
		private readonly userCalendarRepository: Schema$UserCalendarRepository,
		private readonly googleAuth: GoogleAuthAdapter = new GoogleAuthAdapter(),
		private readonly calendarApiFactory: (
			auth: GoogleAuthAdapter
		) => Schema$GoogleCalendarApiAdapter = (auth) => new GoogleCalendarApiAdapter(auth)
	) {}

	async generate(userId: string): Promise<string | null> {
		// 1) トークン取得
		const token = await this.tokenRepository.getToken(userId);
		if (!token) {
			return null;
		}

		// 2) トークン設定＋更新時の永続化
		this.googleAuth.setTokens(token);
		this.googleAuth.setTokensUpdatedListener(async (newTokens) => {
			await this.tokenRepository.updateToken({
				userId,
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
			});
		});

		// 3) 期間計算（明日0:00〜7日後23:59:59 JST 基準）
		const { from, to } = this.buildSpan();

		// 4) 対象カレンダー取得（購読0件や取得失敗時はprimary）
		const calendars = await this.getTargetCalendars(userId);

		// 5) 各カレンダーのイベント取得
		const calendarApi = this.calendarApiFactory(this.googleAuth);
		const results = await Promise.allSettled(
			calendars.map((c) =>
				calendarApi.fetchEvents({ calendarId: c.id, from, to })
			)
		);

		// 6) 整形（カレンダー名付与、時刻順ソート、終日対応）
		const annotated: { ev: Schema$CalendarEvent; calendarName?: string }[] = results.flatMap((r, idx) => {
			if (r.status !== "fulfilled") return [] as { ev: Schema$CalendarEvent; calendarName?: string }[];
			const name = calendars[idx]?.name;
			return r.value.map((ev) => ({ ev, calendarName: name }));
		});

		const events = annotated
			.map((a) => this.toEvent(a.ev, a.calendarName))
			.sort((a, b) => {
				const aTime = a.startDateTime?.getTime() ?? 0;
				const bTime = b.startDateTime?.getTime() ?? 0;
				return aTime - bTime;
			});

		// 7) メッセージ生成
		const message = new CalendarMessageBuilder(events).build();
		return message;
	}

	private async getTargetCalendars(userId: string): Promise<{ id: string; name?: string }[]> {
		try {
			const calendars = await this.userCalendarRepository.getUserCalendars(userId);
			const list = calendars
				.map((c) => ({ id: c.calendarId, name: c.calendarName }))
				.filter((c) => !!c.id);
			return list.length > 0 ? list : [{ id: "primary", name: "メインカレンダー" }];
		} catch {
			return [{ id: "primary", name: "メインカレンダー" }];
		}
	}

	private buildSpan(): { from: Date; to: Date } {
		const from = new Date();
		from.setDate(from.getDate() + 1);
		from.setHours(0, 0, 0, 0);

		const to = new Date();
		to.setDate(to.getDate() + 7);
		to.setHours(23, 59, 59, 999);
		return { from, to };
	}

	private toEvent(ev: Schema$CalendarEvent, calendarName?: string) {
		const summary = ev.summary || "タイトルなし";
		const isAllDay = !ev.start?.dateTime && !!ev.start?.date;
		const startDateTime = isAllDay ? this.toDate(ev.start?.date) : this.toDate(ev.start?.dateTime);
		const endDateTime = isAllDay ? this.toDate(ev.end?.date) : this.toDate(ev.end?.dateTime);
		return { summary, startDateTime, endDateTime, isAllDay, calendarName } as const;
	}

	private toDate(date: string | null | undefined): Date | null {
		if (!date) return null;
		return new Date(date);
	}
}