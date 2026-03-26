import type { PID } from "$lib/types";

/**
 * Converts a given error to a readable version
 *
 * @param error the error to stringify
 * @returns the human-readable error text
 */
export function stringifyError(error: unknown): string {
	switch (typeof error) {
		case "object":
			if (error === null) return "<null error>";
			if ("message" in error && typeof error.message === "string") {
				if ("description" in error && typeof error.description === "string")
					return `${error.message}: ${error.description}`;
				return error.message;
			}
			if ("error" in error) return stringifyError(error.error);
			return JSON.stringify(error);
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
	 * @returns the formatted string
	 */
	toLinkedEntity: (pid, plural = false) =>
		({
			issues: plural ? "Development PRs" : "Development PR",
			pull: plural ? "Closing issues" : "Closing issue",
			discussions: "" // unused
		})[pid]
} as const satisfies Record<`to${string}`, (pid: PID, plural?: boolean) => string>;
