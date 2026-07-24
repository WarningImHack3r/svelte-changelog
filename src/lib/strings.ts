import type { PID } from "#lib/types";

/**
 * Converts a given error to a readable version
 *
 * @param error the error to stringify
 * @param [stack=true] whether to show the stack trace, if available
 * @returns the human-readable error text
 */
export function stringifyError(error: unknown, stack = true): string {
	if (error instanceof Error) {
		let content = stack && error.stack ? error.stack : error.message;
		if (error.cause && !stack)
			content +=
				"\n" +
				stringifyError(error.cause)
					.split("\n")
					.map(line => `\t${line}`)
					.join("\n");
		return content;
	}
	switch (typeof error) {
		case "object":
			if (error === null) return "<null error>";
			if ("message" in error && typeof error.message === "string") {
				if ("description" in error && typeof error.description === "string")
					return `${error.message}: ${error.description}`;
				return error.message;
			}
			if ("error" in error) return stringifyError(error.error);
			try {
				return JSON.stringify(error);
			} catch {
				return "<unserializable error>";
			}
		case "string":
			return error;
	}
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	return `${error}`;
}

/**
 * A series of formatters to convert from a PID to a string.
 */
export const pidFormatter = {
	/**
	 * A stringified version of the PID for display purposes.
	 * Capitalized so it can be lowercased as needed.
	 *
	 * @param pid the PID
	 * @param plural whether the PID is plural
	 * @returns the formatted string
	 */
	toHumanReadable: (pid, plural = false) =>
		({
			issues: plural ? "Issues" : "Issue",
			pull: plural ? "Pull requests" : "Pull request",
			discussions: plural ? "Discussions" : "Discussion"
		})[pid],

	/**
	 * A very specific case to return the counterpart
	 * linked entity corresponding to the input pid.
	 * Capitalized so it can be lowercased as needed.
	 *
	 * @param pid the PID
	 * @param plural whether the PID is plural
	 * @returns the formatted string
	 */
	toLinkedEntity: (pid, plural = false) =>
		({
			issues: plural ? "Development PRs" : "Development PR",
			pull: plural ? "Closing issues" : "Closing issue",
			discussions: "" // unused
		})[pid]
} as const satisfies Record<`to${string}`, (pid: PID, plural?: boolean) => string>;
