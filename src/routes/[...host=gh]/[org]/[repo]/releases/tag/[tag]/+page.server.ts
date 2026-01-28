import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { publicRepos } from "$lib/repositories";

export function load({ params: { org, repo, tag } }) {
	const repository = publicRepos.find(
		({ repoOwner, repoName }) =>
			org.localeCompare(repoOwner, undefined, { sensitivity: "base" }) === 0 &&
			repo.localeCompare(repoName, undefined, { sensitivity: "base" }) === 0
	);
	if (!repository) {
		error(403, {
			message: "Unknown repository",
			description:
				"Svelte Changelog can only display releases for the packages of known repositories. Is this a mistake? Open an issue from the GitHub link in the navigation bar!",
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
	redirect(
		307,
		resolve("/package/[...package]", {
			package: name
		}) + (version ? `#${version}` : "") // avoids empty hash, even though it could hide a version parsing issue
	);
}
