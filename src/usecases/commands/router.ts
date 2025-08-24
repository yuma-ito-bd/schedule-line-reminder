import type { CommandContext, CommandResult } from "../../types/command";
import { CommandRegistry } from "./registry";

/**
 * MessageRouter takes raw text input, normalizes it, resolves a handler,
 * and executes it. This skeleton does not include fallback behavior.
 */
export class MessageRouter {
	constructor(private readonly registry: CommandRegistry) {}

	/** Normalize text for matching: trim and case-fold to lower. */
	private normalize(text: string): string {
		return text.trim();
	}

	/**
	 * Resolve by exact name/alias first, otherwise consult canHandle on all.
	 * Returns undefined when nothing matches.
	 */
	async route(input: string, context: CommandContext): Promise<CommandResult | undefined> {
		const normalized = this.normalize(input);
		const direct = this.registry.getByName(normalized.toLowerCase());
		if (direct) {
			return await direct.handle(normalized, context);
		}

		for (const handler of this.registry.list()) {
			const ok = await handler.canHandle(normalized, context);
			if (ok) {
				return await handler.handle(normalized, context);
			}
		}
		return undefined;
	}
}