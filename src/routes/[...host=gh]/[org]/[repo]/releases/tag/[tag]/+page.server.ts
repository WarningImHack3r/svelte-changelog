import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";
import { publicRepos } from "$lib/repositories";

export function load({ params: { org, repo, tag } }) {
	const repository = publicRepos.find(
		({ repoOwner, repoName }) =>
			org.localeCompare(repoOwner, undefined, { sensitivity: "base" }) === 0 &&
			repo.localeCompare(repoName, undefined, { sensitivity: "base" }) === 0
	);
	if (!repository) {
		error(404, {
			message: "Unknown repository",
			description: `${siteName} can only display releases for the packages of repositories it actively lists. Is this a false positive? Open an issue from the GitHub link in the navigation bar!`,
			link: {
				text: "Go home",
				href: resolve("/")
			}
		});
	}
	const [name, version] = repository.metadataFromTag(tag);
	if (!name) {
		error(400, {
			message: "Failed to parse a valid package name from the release tag",
			description:
				"Is this tag a valid package? If so, please open an issue from the GitHub link in the navigation bar.",
			link: {
				text: "Go home",
				href: resolve("/")
			}
		});
	}
	const versionHash: "" | `#${string}` = version ? `#${version}` : ""; // avoids empty hash, even though this could hide a version parsing issue
	redirect(
		307,
		resolve(`/package/[...package]${versionHash}`, {
			package: name
		})
	);
}
