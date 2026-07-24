import { defineParams } from "@sveltejs/kit";
import * as v from "valibot";
import type { PID } from "#lib/types";

const urlSchemeRegex = /^https?:\/\/?/;
const githubDotCom = "github.com";
type GitHubDotCom = typeof githubDotCom;
type GitHubDotComWithMaybeScheme =
	GitHubDotCom | `http://${GitHubDotCom}` | `https://${GitHubDotCom}`;

export const params = defineParams({
	gh: (param): GitHubDotComWithMaybeScheme | undefined => {
		return param.replace(urlSchemeRegex, "") === githubDotCom
			? (param as GitHubDotComWithMaybeScheme)
			: undefined;
	},
	number: v.pipe(v.string(), v.toNumber()),
	pid: (param): PID | undefined => {
		if (param !== "pull" && param !== "issues" && param !== "discussions") return;
		return param;
	}
});
