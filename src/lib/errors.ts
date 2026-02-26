/**
 * Converts a given error to a readable version
 *
 * @param error the error to stringify
 * @returns the human-readable error text
 */
export function stringify(error: unknown): string {
	switch (typeof error) {
		case "object":
			if (error === null) return "<null error>";
			if ("message" in error) {
				if ("description" in error) return `${error.message}: ${error.description}`;
				return `${error.message}`;
			}
			if ("error" in error) return stringify(error.error);
			return JSON.stringify(error);
		case "string":
			return error;
	}
	return `${error}`;
}
