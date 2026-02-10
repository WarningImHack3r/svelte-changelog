import { error } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { siteName } from "$lib/properties";
import { uniqueRepos } from "$lib/repositories";
import { githubCache } from "$lib/server/github-cache";

// source: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword
const closingKeywords = [
	"close",
	"closes",
	"closed",
	"fix",
	"fixes",
	"fixed",
	"resolve",
	"resolves",
	"resolved"
];

export async function load({ params }) {
	const knownRepo = uniqueRepos.find(
		({ owner, name }) =>
			params.org.localeCompare(owner, undefined, { sensitivity: "base" }) === 0 &&
			params.repo.localeCompare(name, undefined, { sensitivity: "base" }) === 0
	);
	if (!knownRepo) {
		error(404, {
			message: "Unknown repository",
			description: `${siteName} can only track known repositories. Is this a mistake? Open an issue from the GitHub link in the navigation bar!`,
			link: {
				text: "Tracker home page",
				href: resolve("/tracker")
			}
		});
	}

	let members: Awaited<ReturnType<(typeof githubCache)["getOrganizationMembers"]>> = [];
	try {
		members = await githubCache.getOrganizationMembers(knownRepo.owner);
	} catch {
		// probably not an organization
	}
	const membersNames = members.length ? members.map(({ login }) => login) : [knownRepo.owner];
	const now = new Date();

	return {
		prs: githubCache
			.getAllPRs(knownRepo.owner, knownRepo.name)
			.then(unfilteredPRs =>
				unfilteredPRs
					.filter(({ user, body, updated_at }) => {
						if (new Date(updated_at).getFullYear() < now.getFullYear() - 1) return false;
						if (!membersNames.includes(user?.login ?? "")) return false;
						if (!body) return true;
						const lowerBody = body.toLowerCase();
						for (const keyword of closingKeywords) {
							if (
								lowerBody.includes(`${keyword} #`) ||
								lowerBody.includes(`${keyword}: #`) ||
								lowerBody.includes(`${keyword} https://github.com`) ||
								lowerBody.includes(`${keyword}: https://github.com`) ||
								new RegExp(`${keyword} [A-Za-z0-9_-]+/[A-Za-z0-9_-]+#[0-9]+`).test(lowerBody)
							) {
								return false;
							}
						}
						return true;
					})
					.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			)
			.catch(() => "Pull requests are not available for this repo"),
		issues: githubCache
			.getAllIssues(knownRepo.owner, knownRepo.name)
			.then(unfilteredIssues =>
				unfilteredIssues
					.filter(
						({ author_association, pull_request, updated_at }) =>
							!pull_request &&
							author_association === "MEMBER" &&
							new Date(updated_at).getFullYear() >= now.getFullYear() - 1
					)
					.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			)
			.catch(() => "Issues are not available for this repo"),
		discussions: githubCache
			.getAllDiscussions(knownRepo.owner, knownRepo.name)
			.then(unfilteredDiscussions =>
				unfilteredDiscussions
					.filter(
						({ author_association, updated_at }) =>
							author_association === "MEMBER" &&
							new Date(updated_at).getFullYear() >= now.getFullYear() - 1
					)
					.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			)
			.catch(() => "Discussions are not available for this repo")
	};
}
