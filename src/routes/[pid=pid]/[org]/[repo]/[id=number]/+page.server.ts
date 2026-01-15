import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { publicRepos, uniqueRepos } from "$lib/repositories";
import { githubCache } from "$lib/server/github-cache";
import { discoverer } from "$lib/server/package-discoverer";
import type { BranchCommit, PID } from "$lib/types";

export async function load({ params: { pid: type, org, repo, id }, fetch }) {
	const isKnownRepo = uniqueRepos.some(({ owner, name }) => org === owner && repo === name);
	if (!isKnownRepo) {
		error(403, {
			message: "Unknown repository",
			description:
				"Svelte Changelog can only display the details of known repositories. Is this a mistake? Open an issue from the GitHub link in the navigation bar!",
			link: {
				text: "Go home",
				href: resolve("/")
			}
		});
	}

	const item = await githubCache.getItemDetails(org, repo, +id);
	if (!item) {
		error(404, `${type} #${id} doesn't exist in repo ${org}/${repo}`);
	}

	const realType = "commits" in item ? "pull" : "category" in item.info ? "discussions" : "issues";
	if (type !== realType) {
		redirect(307, resolve("/[pid=pid]/[org]/[repo]/[id=number]", { pid: realType, org, repo, id }));
	}

	const matchingRepo = publicRepos.find(r => r.repoOwner === org && r.repoName === repo);

	return {
		itemMetadata: {
			org,
			repo,
			id: +id,
			type: type === "issues" ? "issue" : type === "discussions" ? "discussion" : type
		} satisfies {
			type: PID;
			[key: string]: unknown;
		},
		item,
		mergedTagName: new Promise<[string, string] | undefined>((resolve, reject) => {
			// Credit to Refined GitHub: https://github.com/refined-github/refined-github/blob/main/source/features/closing-remarks.tsx

			// Get the merged PR's sha, otherwise it is not a proper target for this
			if (!("merged" in item.info)) {
				resolve(undefined);
				return;
			}
			const sha = item.info.merge_commit_sha;
			if (!sha) {
				resolve(undefined);
				return;
			}

			// Compute or gather all the known packages to avoid rare 404s
			discoverer
				.getOrDiscover()
				.then(items => items.flatMap(({ packages }) => packages).map(({ name }) => name))
				.then(knownPackages => {
					const knownPackagesSet = new Set(knownPackages);

					// Fetch the merge commit's info
					fetch(`https://github.com/${org}/${repo}/branch_commits/${sha}`, {
						headers: {
							Accept: "application/json"
						}
					})
						.then(res => res.json() as Promise<BranchCommit>)
						.then(({ tags }) => {
							const earliestTag = tags.findLast(tag => {
								// The info is right here after a little filtering :D
								const isValid = !tag.includes("nightly") && /\d[.]\d/.test(tag);
								if (!isValid || !matchingRepo) return false;
								const [pkgName] = matchingRepo.metadataFromTag(tag);
								return knownPackagesSet.has(pkgName);
							});
							if (!earliestTag) {
								resolve(undefined);
								return;
							}
							resolve(matchingRepo?.metadataFromTag(earliestTag));
						})
						.catch(reject);
				});
		})
	};
}
