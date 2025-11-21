export function match(param) {
	return param.replace(/^https?:\/\/?/, "") === "github.com";
}
