import type { PID } from "$lib/types";

export function match(param): param is PID {
	return param === "pull" || param === "issues" || param === "discussions";
}
