import { expect, test, describe } from "bun:test";
import { CommandRegistry } from "../../../src/usecases/commands/registry";

const dummyHandler = (name: string, aliases?: string[]) => ({
	name,
	aliases,
	canHandle: () => false,
	handle: async () => ({ success: true, message: "ok" }),
});

describe("CommandRegistry", () => {
	test("register and getByName by canonical name", () => {
		const reg = new CommandRegistry();
		reg.register(dummyHandler("List"));
		expect(reg.getByName("list")?.name).toBe("List");
		expect(reg.getByName(" list ")?.name).toBe("List");
	});

	test("register with alias and resolve by alias", () => {
		const reg = new CommandRegistry();
		reg.register(dummyHandler("list", ["ls", "一覧"]));
		expect(reg.getByName("ls")?.name).toBe("list");
		expect(reg.getByName("一覧")?.name).toBe("list");
	});

	test("duplicate name throws", () => {
		const reg = new CommandRegistry();
		reg.register(dummyHandler("list"));
		expect(() => reg.register(dummyHandler("LIST"))).toThrow();
	});

	test("alias conflict throws", () => {
		const reg = new CommandRegistry();
		reg.register(dummyHandler("list"));
		expect(() => reg.register(dummyHandler("other", ["List"])) ).toThrow();
	});

	test("list returns unique handlers", () => {
		const reg = new CommandRegistry();
		const h = dummyHandler("a", ["b"]);
		reg.register(h);
		expect(reg.list()).toHaveLength(1);
	});
});