export function match(param): param is "pull" | "issues" | "discussions" {
	return param === "pull" || param === "issues" || param === "discussions";
}
