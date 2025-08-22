import type { CommandHandler, CommandName } from "../../types/command";

/**
 * Registry to hold and resolve command handlers by name or predicate.
 * Non-mutating lookups; registration is idempotent by canonical name.
 */
export class CommandRegistry {
	private readonly nameToHandler: Map<string, CommandHandler> = new Map();

	/** Register a handler. Throws on conflicting duplicate canonical name. */
	register(handler: CommandHandler): void {
		const canonical = this.canonicalize(handler.name);
		if (this.nameToHandler.has(canonical)) {
			throw new Error(`Command already registered: ${handler.name}`);
		}
		this.nameToHandler.set(canonical, handler);

		if (handler.aliases) {
			for (const alias of handler.aliases) {
				const a = this.canonicalize(alias);
				if (this.nameToHandler.has(a)) {
					throw new Error(`Alias conflicts with existing command: ${alias}`);
				}
				this.nameToHandler.set(a, handler);
			}
		}
	}

	/** Find by exact name or alias (case-insensitive, trimmed). */
	getByName(name: CommandName): CommandHandler | undefined {
		const key = this.canonicalize(name);
		return this.nameToHandler.get(key);
	}

	/** Return all unique handlers (deduped by instance). */
	list(): CommandHandler[] {
		return Array.from(new Set(this.nameToHandler.values()));
	}

	private canonicalize(input: string): string {
		return input.trim().toLowerCase();
	}
}