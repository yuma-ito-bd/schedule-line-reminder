export type CommandName = string;

/**
 * Context provided to command handlers during routing and execution.
 * Contains caller identity, optional locale, and optionally shared services/loggers.
 */
export type CommandContext = {
	/** LINE user id */
	userId: string;
	/** Optional replyToken if available in the flow */
	replyToken?: string;
	/** BCP-47 language tag (e.g. "ja", "en-US") */
	locale?: string;
	/** Arbitrary service container for external I/O or gateways */
	services?: unknown;
	/** Console compatible logger */
	logger?: Pick<Console, "debug" | "info" | "warn" | "error">;
};

/**
 * Result produced by a command handler. This is intentionally minimal so
 * that it maps one-to-one onto `WebhookUseCaseResult` without ambiguity.
 */
export type CommandResult = {
	success: boolean;
	/** Primary human-readable message for the caller */
	message: string;
};

/**
 * Single-responsibility command handler which can decide whether it can
 * process a given input and, if so, produce a `CommandResult`.
 */
export interface CommandHandler {
	/** Canonical name of the command (case-insensitive) */
	readonly name: CommandName;
	/** Optional aliases for discovery (case-insensitive) */
	readonly aliases?: CommandName[];
	/**
	 * Quick predicate hint for router/registry-based resolution.
	 * Should be side-effect free.
	 */
	canHandle: (input: string, context: CommandContext) => boolean | Promise<boolean>;
	/** Execute the command. */
	handle: (input: string, context: CommandContext) => Promise<CommandResult>;
}