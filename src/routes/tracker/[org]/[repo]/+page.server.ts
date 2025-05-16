import { error } from "@sveltejs/kit";
import { gitHubCache } from "$lib/server/github-cache";

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
	const members = await gitHubCache.getOrganizationMembers(params.org);
	if (!members.length) error(404, `Organization ${params.org} not found or empty`);

	const membersNames = members.map(({ login }) => login);

	const [unfilteredPRs, unfilteredIssues, unfilteredDiscussions] = await Promise.all([
		gitHubCache.getAllPRs(params.org, params.repo),
		gitHubCache.getAllIssues(params.org, params.repo),
		gitHubCache.getAllDiscussions(params.org, params.repo)
	]);
	return {
		prs: unfilteredPRs
			.filter(({ user, body }) => {
				if (!membersNames.includes(user?.login ?? "")) return false;
				if (!body) return true;
				const lowerBody = body.toLowerCase();
				for (const keyword of closingKeywords) {
					if (
						lowerBody.includes(`${keyword} #`) ||
						lowerBody.includes(`${keyword} https://github.com`) ||
						new RegExp(`${keyword} [A-Za-z0-9_-]+/[A-Za-z0-9_-]+#[0-9]+`).test(lowerBody)
					) {
						return false;
					}
				}
				return true;
			})
			.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
		issues: unfilteredIssues
			.filter(
				({ author_association, pull_request }) => !pull_request && author_association === "MEMBER"
			)
			.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
		discussions: unfilteredDiscussions
			.filter(
				({ author_association, updated_at }) =>
					author_association === "MEMBER" &&
					new Date(updated_at).getFullYear() >= new Date().getFullYear() - 1
			)
			.toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
	};
}
