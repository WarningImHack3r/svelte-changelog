/**
 * Converts a given error to a readable version
 *
 * @param error the error to stringify
 * @returns the human-readable error text
 */
export function stringify(error: unknown): string {
	switch (typeof error) {
		case "object":
			return error === null
				? "<null error>"
				: "message" in error
					? "description" in error
						? `${error.message}: ${error.description}`
						: `${error.message}`
					: "error" in error
						? stringify(error.error)
						: JSON.stringify(error);
		case "string":
			return error;
	}
	return `${error}`;
}
