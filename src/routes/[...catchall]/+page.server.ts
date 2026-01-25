import { error } from "@sveltejs/kit";

// required to avoid matching `[...host]` and its subpages
// see: https://github.com/sveltejs/kit/issues/15204
export function load() {
	error(404);
}
