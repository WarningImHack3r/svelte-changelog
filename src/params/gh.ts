const urlSchemeRegex = /^https?:\/\/?/;

type GitHubDotCom = "github.com";

export function match(
	param
): param is GitHubDotCom | `http://${GitHubDotCom}` | `https://${GitHubDotCom}` {
	return param.replace(urlSchemeRegex, "") === "github.com";
}
