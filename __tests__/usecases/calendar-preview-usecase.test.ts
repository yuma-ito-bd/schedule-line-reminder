import { expect, test, describe, beforeEach, spyOn } from "bun:test";
import { CalendarPreviewUseCase } from "../../src/usecases/calendar-preview-usecase";

class TokenRepoMock {
	private token: any = null;
	setToken(t: any) { this.token = t; }
	async getToken(userId: string) { return this.token; }
	async updateToken() { return; }
}

class UserCalendarRepoMock {
	private calendars: any[] = [];
	setCalendars(cals: any[]) { this.calendars = cals; }
	async getUserCalendars(userId: string) { return this.calendars; }
}

class GoogleAuthStub {
	setTokens() {}
	setTokensUpdatedListener() {}
}

function createUseCase(tokenRepo: any, calRepo: any, eventsMap: Record<string, any[]>) {
	const auth = new GoogleAuthStub() as any;
	const uc = new CalendarPreviewUseCase(
		tokenRepo,
		calRepo,
		auth,
		() => ({
			async fetchEvents({ calendarId }: any) {
				return eventsMap[calendarId] || [];
			},
			async fetchCalendarList() { return []; },
		}) as any
	);
	return uc;
}

describe("CalendarPreviewUseCase", () => {
	let tokenRepo: TokenRepoMock;
	let calRepo: UserCalendarRepoMock;

	beforeEach(() => {
		tokenRepo = new TokenRepoMock();
		calRepo = new UserCalendarRepoMock();
	});

	test("トークンがない場合はnullを返す", async () => {
		const uc = createUseCase(tokenRepo, calRepo, {});
		const res = await uc.generate("u1");
		expect(res).toBeNull();
	});

	test("primaryのみでイベント0件でもフォーマットが返る", async () => {
		tokenRepo.setToken({ userId: "u1", accessToken: "a", refreshToken: "r" });
		calRepo.setCalendars([]);
		const uc = createUseCase(tokenRepo, calRepo, { primary: [] });
		const res = await uc.generate("u1");
		expect(typeof res).toBe("string");
		expect(res).toContain("明日から1週間の予定です。");
		// includes at least first date header symbol
		expect(res).toContain("📅 ");
	});

	test("終日と時間指定イベントを混在で整形する", async () => {
		tokenRepo.setToken({ userId: "u1", accessToken: "a", refreshToken: "r" });
		calRepo.setCalendars([{ userId: "u1", calendarId: "primary", calendarName: "メイン", createdAt: new Date(), updatedAt: new Date() }]);
		const today = new Date();
		const ymd = new Date(today);
		ymd.setDate(ymd.getDate() + 1);
		const y = ymd.getUTCFullYear();
		const m = String(ymd.getUTCMonth() + 1).padStart(2, "0");
		const d = String(ymd.getUTCDate()).padStart(2, "0");
		const allDayDate = `${y}-${m}-${d}`;
		const events = {
			primary: [
				{ summary: "終日の予定", start: { date: allDayDate }, end: { date: allDayDate } },
				{ summary: "時間あり", start: { dateTime: new Date(ymd.getTime()).toISOString() }, end: { dateTime: new Date(ymd.getTime() + 60*60*1000).toISOString() } },
			],
		};
		const uc = createUseCase(tokenRepo, calRepo, events as any);
		const res = await uc.generate("u1");
		expect(res).toContain("終日");
		expect(res).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
	});

	test("複数カレンダーをマージしカレンダー名を付与", async () => {
		tokenRepo.setToken({ userId: "u1", accessToken: "a", refreshToken: "r" });
		calRepo.setCalendars([
			{ userId: "u1", calendarId: "cal1", calendarName: "仕事", createdAt: new Date(), updatedAt: new Date() },
			{ userId: "u1", calendarId: "cal2", calendarName: "私用", createdAt: new Date(), updatedAt: new Date() },
		]);
		const future = new Date();
		future.setDate(future.getDate() + 1);
		const events = {
			cal1: [ { summary: "A", start: { dateTime: future.toISOString() }, end: { dateTime: future.toISOString() } } ],
			cal2: [ { summary: "B", start: { dateTime: future.toISOString() }, end: { dateTime: future.toISOString() } } ],
		};
		const uc = createUseCase(tokenRepo, calRepo, events as any);
		const res = await uc.generate("u1");
		expect(res).toContain("[仕事]");
		expect(res).toContain("[私用]");
	});
});