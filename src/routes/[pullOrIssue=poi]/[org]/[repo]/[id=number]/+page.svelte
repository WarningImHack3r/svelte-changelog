<script lang="ts">
	import type { Octokit } from "octokit";
	import Markdown from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Separator } from "$lib/components/ui/separator";
	import { Button } from "$lib/components/ui/button";
	import GHBadge from "$lib/components/GHBadge.svelte";

	export let data;

	// Utils
	function formatToDateTime(date: string) {
		return new Intl.DateTimeFormat("en", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(date));
	}

	// Issues
	type ResponseEntity = {
		createdAt: string;
		author: {
			login: string;
			avatarUrl: string;
		};
		number: number;
		body: string;
		title: string;
	};
	let resolvedClosingIssues: ResponseEntity[] | undefined = undefined;

	// PR
	type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
	let prInfo: {
		info: Awaited<ReturnType<Pulls["get"]>>["data"] | undefined;
		files: Awaited<ReturnType<Pulls["listFiles"]>>["data"] | undefined;
		commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"] | undefined;
	} = {
		info: undefined,
		files: undefined,
		commits: undefined
	};
	let rightPartInfo: { title: string; value: string; separate?: boolean }[] = [];
	$: if (prInfo.info) {
		rightPartInfo = [
			{
				title: prInfo.info.merged ? "Merged at" : "Closed at",
				value: prInfo.info.closed_at ? formatToDateTime(prInfo.info.closed_at) : "Open"
			},
			{ title: "Assignees", value: prInfo.info.assignees?.join(", ") || "None" },
			{
				title: "Reviewers",
				value: prInfo.info.requested_reviewers?.map(r => r.login).join(", ") || "None"
			},
			{ title: "Labels", value: prInfo.info.labels?.join(", ") || "None" },
			{ title: "Milestone", value: prInfo.info.milestone?.title || "None" },
			{ title: "Comments", value: prInfo.info.comments.toString(), separate: true },
			{ title: "Commits", value: prInfo.info.commits.toString(), separate: true },
			{ title: "Files", value: prInfo.info.changed_files.toString() }
		];
	}

	// Data fetching
	$: if (data.pullOrIssue === "pull") {
		// Fetch PR info
		data.octokit.rest.pulls
			.get({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.info = data));
		data.octokit.rest.pulls
			.listFiles({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.files = data));
		data.octokit.rest.pulls
			.listCommits({
				owner: data.org,
				repo: data.repo,
				pull_number: data.id
			})
			.then(({ data }) => (prInfo.commits = data));

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
					resolvedClosingIssues = response.repository.pullRequest.closingIssuesReferences.nodes;
				}
			)
			.catch(() => (resolvedClosingIssues = []));
	}
</script>

<svelte:head>
	<title>Detail of {data.org}/{data.repo}#{data.id} | Svelte Changelog</title>
</svelte:head>

<div class="container py-8">
	{#if prInfo.info && prInfo.files && prInfo.commits}
		<!-- TODO: support issues only -->
		<h2 class="mb-8 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
			<span
				class="prose prose-2xl text-3xl dark:prose-invert *:inline dark:text-primary-foreground"
			>
				<Markdown md={prInfo.info.title} plugins={[gfmPlugin()]} />
			</span>
			<span class="ml-1 font-light text-muted-foreground">#{prInfo.info.number}</span>
		</h2>
		{#if resolvedClosingIssues}
			<h3 class="text-2xl font-semibold tracking-tight">
				Closing issue{resolvedClosingIssues.length > 1 ? "s" : ""}
			</h3>
			<Accordion.Root class="mb-12">
				{#each resolvedClosingIssues as closingIssue}
					<Accordion.Item value={closingIssue.number.toString()}>
						<Accordion.Trigger class="group hover:no-underline">
							<!-- Title -->
							<span class="text-left *:group-hover:underline">
								<span
									class="prose leading-normal dark:prose-invert *:inline dark:text-primary-foreground"
								>
									<Markdown md={closingIssue.title} plugins={[gfmPlugin()]} />
								</span>
								<span class="ml-1 font-light text-muted-foreground">#{closingIssue.number}</span>
							</span>
							<!-- Author & Date -->
							<div
								class="ml-auto mr-4 flex items-center gap-2 whitespace-nowrap pl-32 text-right text-sm text-muted-foreground"
							>
								<Avatar.Root class="size-6">
									<Avatar.Image
										src={closingIssue.author.avatarUrl}
										alt={closingIssue.author.login}
									/>
									<Avatar.Fallback>
										{closingIssue.author.login.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<span>{closingIssue.author.login}</span>
								<span>•</span>
								<span>{formatToDateTime(closingIssue.createdAt)}</span>
							</div>
						</Accordion.Trigger>
						<Accordion.Content
							class="prose mx-auto w-3/4 max-w-full text-base dark:prose-invert prose-a:no-underline prose-a:underline-offset-4 prose-a:[overflow-wrap:_break-word] hover:prose-a:underline prose-li:my-1"
						>
							<Markdown md={closingIssue.body} plugins={[gfmPlugin()]} />
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		{/if}
		<div class="flex items-center justify-between">
			<h3 class="text-2xl font-semibold tracking-tight">Pull request</h3>
			<GHBadge
				type={prInfo.info.closed_at ? (prInfo.info.merged ? "pr-merged" : "pr-closed") : "pr-open"}
			/>
		</div>
		<div class="mt-4 flex flex-col gap-8 md:gap-4">
			<!-- Info -->
			<div class="flex w-full flex-col gap-8 md:flex-row">
				<!-- Left part - body -->
				<div class="w-full rounded-xl border">
					<!-- Author -->
					<div class="inline-flex w-full items-center border-b px-4 py-2">
						<Avatar.Root class="size-5">
							<Avatar.Image src={prInfo.info.user.avatar_url} alt={prInfo.info.user.login} />
							<Avatar.Fallback>{prInfo.info.user.login.charAt(0).toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
						<span class="ml-2 mr-1.5">{prInfo.info.user.login}</span>
						<span class="text-muted-foreground">
							•
							{formatToDateTime(prInfo.info.created_at)}
						</span>
					</div>
					<!-- Body -->
					<div
						class="prose max-w-full p-4 dark:prose-invert prose-a:no-underline prose-a:underline-offset-4 prose-a:[overflow-wrap:_break-word] hover:prose-a:underline prose-li:my-1"
					>
						<Markdown
							md={prInfo.info.body || "_No description provided_"}
							plugins={[gfmPlugin()]}
						/>
					</div>
				</div>
				<!-- Right part - info -->
				<div class="h-fit w-2/5 max-w-xs rounded-xl border px-4 py-3">
					<h4 class="mb-4 border-b pb-1 text-xl font-semibold">Info</h4>
					{#each rightPartInfo as { title, value, separate }, i}
						{#if i > 0}
							<Separator class="my-2" />
						{/if}
						<div class="flex items-center justify-between *:text-nowrap" class:mt-12={separate}>
							<span class="font-medium">{title}</span>
							<span class="text-muted-foreground">{value}</span>
						</div>
					{/each}
				</div>
			</div>
			<!-- Files -->
			<div class="rounded-xl border px-4">
				<Accordion.Root>
					<Accordion.Item value="files" class="border-b-0">
						<Accordion.Trigger class="group hover:no-underline">
							<span class="text-xl font-semibold">Files</span>
							<span class="ml-auto mr-4 text-muted-foreground">
								{prInfo.files.length} changed files
							</span>
						</Accordion.Trigger>
						<Accordion.Content>
							<div class="flex flex-col gap-1">
								{#each prInfo.files as file}
									<div class="flex items-center justify-between gap-2">
										<span>{file.filename}</span>
										<span class="text-nowrap text-muted-foreground">{file.changes} changes</span>
									</div>
								{/each}
							</div>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</div>
		</div>
		<!-- Bottom links -->
		<div class="gap mt-16 flex w-full items-center justify-between gap-40">
			<Button href="/" variant="link" class="group">
				<ChevronLeft
					class="mr-1 size-4 transition-transform duration-300 group-hover:-translate-x-1"
				/>
				Back to homepage
			</Button>
			<div>
				{#each resolvedClosingIssues ?? [] as closingIssue}
					<Button href={`/issues/${data.org}/${data.repo}/${closingIssue.number}`} variant="link">
						Open issue #{closingIssue.number}
					</Button>
				{/each}
				<Button href={prInfo.info.html_url} target="_blank" class="group dark:text-black">
					Open pull request on GitHub
					<ArrowUpRight
						class="ml-2 size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
					/>
				</Button>
			</div>
		</div>
	{:else}
		<span class="mt-6 text-2xl font-semibold tracking-tight">Loading info...</span>
	{/if}
</div>
