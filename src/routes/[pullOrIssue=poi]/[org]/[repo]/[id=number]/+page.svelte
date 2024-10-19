<script lang="ts">
	import { run } from "svelte/legacy";

	import { LoaderCircle } from "lucide-svelte";
	import { getOctokit } from "$lib/octokit";
	import type { Issues, LinkedEntity, Pulls } from "./types";
	import PageRenderer from "./PageRenderer.svelte";

	type Props = {
		data: any;
	};

	let { data }: Props = $props();
	let { org: owner, id, repo, pullOrIssue } = $derived(data);

	const octokit = getOctokit();

	async function linkedIssuesForPR(
		owner: string,
		repo: string,
		pr: number
	): Promise<LinkedEntity[]> {
		return octokit
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
					owner,
					repo,
					number: pr
				}
			)
			.then(
				/* eslint-disable @typescript-eslint/no-explicit-any */ (response: any) =>
					response.repository.pullRequest.closingIssuesReferences.nodes
			)
			.catch(() => []);
	}

	// PR issues or issue PRs
	let linkedPRsOrIssues = $state<LinkedEntity[]>();

	// PR
	let prInfo = $state<{
		info: Awaited<ReturnType<Pulls["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
		commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"] | undefined;
		files: Awaited<ReturnType<Pulls["listFiles"]>>["data"] | undefined;
	}>({
		info: undefined,
		comments: undefined,
		commits: undefined,
		files: undefined
	});

	// Issue
	let issueInfo = $state<{
		info: Awaited<ReturnType<Issues["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
	}>({
		info: undefined,
		comments: undefined
	});
	let prsToFetch = $state<number[]>([]);

	let info = $derived(prInfo.info || issueInfo.info);

	// Data fetching
	run(() => {
		if (pullOrIssue === "pull") {
			linkedPRsOrIssues = [];
			issueInfo = {
				info: undefined,
				comments: undefined
			};

			// Fetch PR info
			octokit.rest.pulls
				.get({
					owner,
					repo,
					pull_number: id
				})
				.then(({ data }) => (prInfo.info = data));
			octokit.rest.issues
				.listComments({
					owner,
					repo,
					issue_number: id
				})
				.then(
					({ data }) =>
						(prInfo.comments = data.sort(
							(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
						))
				);
			octokit.rest.pulls
				.listCommits({
					owner,
					repo,
					pull_number: id
				})
				.then(({ data }) => (prInfo.commits = data));
			octokit.rest.pulls
				.listFiles({
					owner,
					repo,
					pull_number: id
				})
				.then(({ data }) => (prInfo.files = data));

			// Fetch closing issues
			linkedIssuesForPR(owner, repo, id).then(response => (linkedPRsOrIssues = response));
		}
	});
	run(() => {
		if (pullOrIssue === "issues") {
			linkedPRsOrIssues = [];
			prInfo = {
				info: undefined,
				comments: undefined,
				commits: undefined,
				files: undefined
			};

			octokit.rest.issues
				.get({
					owner,
					repo,
					issue_number: id
				})
				.then(({ data }) => (issueInfo.info = data));
			octokit.rest.issues
				.listComments({
					owner,
					repo,
					issue_number: id
				})
				.then(
					({ data }) =>
						(issueInfo.comments = data.sort(
							(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
						))
				);
			octokit.rest.issues
				.listEventsForTimeline({
					owner,
					repo,
					issue_number: id
				})
				.then(({ data: events }) =>
					events.filter(
						event =>
							event.event === "cross-referenced" &&
							"source" in event &&
							event.source.issue?.repository?.owner.login === owner &&
							event.source.issue?.repository?.name === repo
					)
				)
				.then(async crEvents => {
					const prEvents = [];
					for (let event of crEvents) {
						const anyEvent = event as any;
						const doesPRExist = await octokit.rest.pulls
							.get({
								owner,
								repo,
								pull_number: anyEvent.source.issue.number
							})
							.then(() => true)
							.catch(() => false);
						if (!doesPRExist) continue;

						const containedInPr = await linkedIssuesForPR(
							owner,
							repo,
							anyEvent.source.issue.number
						);
						if (containedInPr.map(pr => pr.number).includes(id)) {
							prEvents.push(event);
						}
					}
					return prEvents;
				})
				.then(prEvents => {
					prsToFetch = prEvents.map(event => (event as any).source.issue.number);
				})
				.catch(() => (linkedPRsOrIssues = []));
		}
	});
	run(() => {
		if (prsToFetch.length > 0) {
			Promise.all(
				prsToFetch.map(prNumber =>
					octokit.rest.pulls.get({
						owner,
						repo,
						pull_number: prNumber
					})
				)
			)
				.then(prs => {
					if (!linkedPRsOrIssues) {
						linkedPRsOrIssues = [];
					}
					for (let { data } of prs) {
						if (linkedPRsOrIssues.map(i => i.number).includes(data.number)) {
							continue;
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
					}
					linkedPRsOrIssues = linkedPRsOrIssues.sort(
						(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
					);
					prsToFetch = prsToFetch.filter(
						prNumber => !prs.map(pr => pr.data.number).includes(prNumber)
					);
				})
				.catch(() => (prsToFetch = []));
		}
	});
</script>

<svelte:head>
	<title>Detail of {owner}/{repo}#{id} | Svelte Changelog</title>
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
