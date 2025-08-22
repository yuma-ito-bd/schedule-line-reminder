import { expect, test, describe } from "bun:test";
import { CommandRegistry } from "../../../src/usecases/commands/registry";
import { MessageRouter } from "../../../src/usecases/commands/router";
import type { CommandHandler } from "../../../src/types/command";

const makeHandler = (name: string, can: (input: string) => boolean): CommandHandler => ({
	name,
	canHandle: async (input) => can(input),
	handle: async (input) => ({ success: true, message: `handled:${name}:${input}` }),
});

describe("MessageRouter", () => {
	test("resolves by direct name/alias (case-insensitive, trimmed)", async () => {
		const reg = new CommandRegistry();
		const h = makeHandler("list", () => false);
		(h as any).aliases = ["ls"];
		reg.register(h);
		const router = new MessageRouter(reg);
		const ctx = { userId: "u" };
		const r1 = await router.route(" list ", ctx);
		expect(r1?.message).toBe("handled:list:list");
		const r2 = await router.route("LS", ctx);
		expect(r2?.message).toBe("handled:list:LS");
	});

	test("falls back to predicate when no direct match", async () => {
		const reg = new CommandRegistry();
		reg.register(makeHandler("echo", (i) => i.startsWith("echo ")));
		const router = new MessageRouter(reg);
		const res = await router.route("echo hello", { userId: "u" });
		expect(res?.message).toBe("handled:echo:echo hello");
	});

	test("returns undefined when no handler matches", async () => {
		const reg = new CommandRegistry();
		const router = new MessageRouter(reg);
		const res = await router.route("unknown", { userId: "u" });
		expect(res).toBeUndefined();
	});
});