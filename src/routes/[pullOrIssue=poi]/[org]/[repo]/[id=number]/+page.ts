export async function load({ params }) {
	const { pullOrIssue, org, repo, id } = params;

	return {
		pullOrIssue: pullOrIssue as "pull" | "issues",
		org,
		repo,
		id: Number(id)
	};
}
