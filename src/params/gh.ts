const urlSchemeRegex = /^https?:\/\/?/;

export function match(param) {
	return param.replace(urlSchemeRegex, "") === "github.com";
}
