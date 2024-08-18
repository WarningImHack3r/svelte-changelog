import { Octokit } from "octokit";
import type { Prettify, Settings } from "../types";

export function getDataFromSettings<T extends { octokit: Octokit }>(
	data: T,
	settings: Settings
): Prettify<Omit<T, "octokit"> & { octokit: Promise<InstanceType<typeof Octokit>> }> {
	if (!settings.githubToken || settings.githubToken.trim() === "") {
		return {
			...data,
			octokit: Promise.resolve(data.octokit)
		};
	}

	return {
		...data,
		octokit: data.octokit.rest.users
			.getAuthenticated()
			.then(() => data.octokit)
			.catch(
				() =>
					new Octokit({
						auth: settings.githubToken
					})
			)
	};
}
