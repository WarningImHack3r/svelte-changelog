import { error } from "@sveltejs/kit";
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
	const members = await githubCache.getOrganizationMembers(params.org);
	if (!members.length) error(404, `Organization ${params.org} not found or empty`);

	const membersNames = members.map(({ login }) => login);
	const now = new Date();

	return {
		prs: githubCache.getAllPRs(params.org, params.repo).then(unfilteredPRs =>
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
		),
		issues: githubCache
			.getAllIssues(params.org, params.repo)
			.then(unfilteredIssues =>
				unfilteredIssues
					.filter(
						({ author_association, pull_request, updated_at }) =>
							!pull_request &&
							author_association === "MEMBER" &&
							new Date(updated_at).getFullYear() >= now.getFullYear() - 1
					)
					.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			),
		discussions: githubCache
			.getAllDiscussions(params.org, params.repo)
			.then(unfilteredDiscussions =>
				unfilteredDiscussions
					.filter(
						({ author_association, updated_at }) =>
							author_association === "MEMBER" &&
							new Date(updated_at).getFullYear() >= now.getFullYear() - 1
					)
					.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			)
	};
}
