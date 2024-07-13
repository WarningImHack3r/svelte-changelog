<script lang="ts">
	import type { Issues, LinkedEntity, Pulls } from "./types";
	import PageRenderer from "./PageRenderer.svelte";
	import LoaderCircle from "lucide-svelte/icons/loader-circle";

	export let data;

	// PR issues or issue PRs
	let linkedPRsOrIssues: LinkedEntity[] | undefined = undefined;

	// PR
	let prInfo: {
		info: Awaited<ReturnType<Pulls["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
		commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"] | undefined;
		files: Awaited<ReturnType<Pulls["listFiles"]>>["data"] | undefined;
	} = {
		info: undefined,
		comments: undefined,
		commits: undefined,
		files: undefined
	};

	// Issue
	let issueInfo: {
		info: Awaited<ReturnType<Issues["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
	} = {
		info: undefined,
		comments: undefined
	};

	$: info = prInfo.info || issueInfo.info;
	$: pullOrIssue = data.pullOrIssue;

	// Data fetching
	$: if (pullOrIssue === "pull") {
		linkedPRsOrIssues = [];
		issueInfo = {
			info: undefined,
			comments: undefined
		};

		// Fetch PR info
		data.octokit.rest.pulls
			.get({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.info = data));
		data.octokit.rest.issues
			.listComments({
				owner: data.org,
				repo: data.repo,
				issue_number: data.id
			})
			.then(
				({ data }) =>
					(prInfo.comments = data.sort(
						(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
					))
			);
		data.octokit.rest.pulls
			.listCommits({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.commits = data));
		data.octokit.rest.pulls
			.listFiles({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.files = data));

		// Fetch closing issues
		data.octokit
			.graphql(
				`
				query closingIssues($number: Int!, $owner: String!, $repo: String!) {
					repository(owner: $owner, name: $repo) {
						pullRequest(number: $number) {
							closingIssuesReferences(first: 10) {
								nodes {
									createdAt
									author {
										login
										avatarUrl
									}
									number
									title
									body
								}
							}
						}
					}
				}
				`,
				{
					owner: data.org,
					repo: data.repo,
					number: data.id
				}
			)
			.then(
				/* eslint-disable @typescript-eslint/no-explicit-any */ (response: any) => {
					linkedPRsOrIssues = response.repository.pullRequest.closingIssuesReferences.nodes;
				}
			)
			.catch(() => (linkedPRsOrIssues = []));
	}
	$: if (pullOrIssue === "issues") {
		linkedPRsOrIssues = [];
		prInfo = {
			info: undefined,
			comments: undefined,
			commits: undefined,
			files: undefined
		};

		data.octokit.rest.issues
			.get({
				owner: data.org,
				repo: data.repo,
				issue_number: data.id
			})
			.then(({ data }) => (issueInfo.info = data));
		data.octokit.rest.issues
			.listComments({
				owner: data.org,
				repo: data.repo,
				issue_number: data.id
			})
			.then(
				({ data }) =>
					(issueInfo.comments = data.sort(
						(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
					))
			);
		data.octokit.rest.issues
			.listEventsForTimeline({
				owner: data.org,
				repo: data.repo,
				issue_number: data.id
			})
			.then(({ data: response }) => {
				for (let event of response) {
					if (event.event === "cross-referenced") {
						const anyEvent = event as any; // doesn't have the source property for some reason
						const prNumber = anyEvent.source.issue.number;
						data.octokit.rest.pulls
							.get({
								owner: data.org,
								repo: data.repo,
								pull_number: prNumber
							})
							.then(({ data }) => {
								if (!linkedPRsOrIssues) {
									linkedPRsOrIssues = [];
								}
								if (linkedPRsOrIssues.map(i => i.number).includes(data.number)) {
									return;
								}
								linkedPRsOrIssues.push({
									title: data.title,
									author: {
										login: data.user.login,
										avatarUrl: data.user.avatar_url
									},
									body: data.body ?? "",
									createdAt: data.created_at,
									number: data.number
								});
								linkedPRsOrIssues = [...linkedPRsOrIssues];
							});
					}
				}
			})
			.catch(() => (linkedPRsOrIssues = []));
	}
</script>

<svelte:head>
	<title>Detail of {data.org}/{data.repo}#{data.id} | Svelte Changelog</title>
</svelte:head>

{#if info}
	<PageRenderer
		{info}
		comments={prInfo.comments || issueInfo.comments || []}
		commits={prInfo.commits || []}
		files={prInfo.files || []}
		linkedEntities={linkedPRsOrIssues || []}
	/>
{:else}
	<span class="container mt-16 flex items-center gap-2 text-2xl font-semibold tracking-tight">
		<LoaderCircle class="size-6 animate-spin" />
		Loading info...
	</span>
{/if}
