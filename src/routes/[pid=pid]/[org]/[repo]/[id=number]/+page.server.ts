import { error, redirect } from "@sveltejs/kit";
import { publicRepos } from "$lib/repositories";
import { githubCache } from "$lib/server/github-cache";
import type { BranchCommit } from "$lib/types";

export async function load({ params, fetch }) {
	const { pid: type, org, repo, id } = params;
	const numId = +id; // id is already validated by the route matcher

	const item = await githubCache.getItemDetails(org, repo, numId);
	if (!item) {
		error(404, `${type} #${id} doesn't exist in repo ${org}/${repo}`);
	}

	const realType = "commits" in item ? "pull" : "category" in item.info ? "discussions" : "issues";
	if (type !== realType) {
		redirect(307, `/${realType}/${org}/${repo}/${id}`);
	}

	const matchingRepo = publicRepos.find(r => r.repoOwner === org && r.repoName === repo);

	return {
		itemMetadata: {
			org,
			repo,
			id: numId,
			type:
				type === "issues"
					? ("issue" as const)
					: type === "discussions"
						? ("discussion" as const)
						: ("pull" as const)
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
			// Fetch the merge commit's info
			fetch(`https://github.com/${org}/${repo}/branch_commits/${sha}`, {
				headers: {
					Accept: "application/json"
				}
			})
				.then(res => res.json() as Promise<BranchCommit>)
				.then(({ tags }) => {
					// The info is right here after a little filtering :D
					const earliestTag = tags.findLast(tag => !tag.includes("nightly") && /\d[.]\d/.test(tag));
					if (!earliestTag) {
						resolve(undefined);
						return;
					}
					resolve(matchingRepo?.metadataFromTag(earliestTag));
				})
				.catch(reject);
		})
	};
}
