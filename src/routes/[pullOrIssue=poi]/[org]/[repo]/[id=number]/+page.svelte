<script lang="ts">
	import type { Octokit } from "octokit";
	import Markdown from "svelte-exmarkdown";
	import { gfmPlugin } from "svelte-exmarkdown/gfm";
	import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import FileDiff from "lucide-svelte/icons/file-diff";
	import GitCommitVertical from "lucide-svelte/icons/git-commit-vertical";
	import MessagesSquare from "lucide-svelte/icons/messages-square";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Separator } from "$lib/components/ui/separator";
	import { Button } from "$lib/components/ui/button";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import Step from "$lib/components/Step.svelte";
	import Steps from "$lib/components/Steps.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import { Badge } from "$lib/components/ui/badge";

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
	type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
	type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
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
	let rightPartInfo: { title: string; value: string }[] = [];
	$: if (prInfo.info) {
		rightPartInfo = [
			...(prInfo.info.closed_at
				? [
						{
							title: prInfo.info.merged ? "Merged at" : "Closed at",
							value: formatToDateTime(prInfo.info.closed_at)
						}
					]
				: []),
			{ title: "Assignees", value: prInfo.info.assignees?.join(", ") || "None" },
			{
				title: "Reviewers",
				value: prInfo.info.requested_reviewers?.map(r => r.login).join(", ") || "None"
			},
			{ title: "Labels", value: prInfo.info.labels?.join(", ") || "None" },
			{ title: "Milestone", value: prInfo.info.milestone?.title || "None" }
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
					resolvedClosingIssues = response.repository.pullRequest.closingIssuesReferences.nodes;
				}
			)
			.catch(() => (resolvedClosingIssues = []));
	}
</script>

<svelte:head>
	<title>Detail of {data.org}/{data.repo}#{data.id} | Svelte Changelog</title>
</svelte:head>

<!-- TODO: move into separate components, especially md rendering related -->
<!-- TODO: use Shiki for bodies snippets & detailed diff -->

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
			{#if resolvedClosingIssues.length > 0}
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
		{:else}
			<span class="text-lg font-semibold tracking-tight">Loading closing issues...</span>
		{/if}
		<div class="flex items-center justify-between">
			<h3 class="text-2xl font-semibold tracking-tight">Pull request</h3>
			<GHBadge
				type="pr"
				status={prInfo.info.closed_at
					? prInfo.info.merged
						? "merged"
						: "closed"
					: prInfo.info.draft
						? "draft"
						: "open"}
			/>
		</div>
		<div class="mt-4 flex flex-col gap-4">
			<!-- Info -->
			<div class="mb-8 flex w-full flex-col gap-8 md:flex-row">
				<!-- Left part - body -->
				<div class="w-full rounded-xl border bg-muted/30">
					<!-- Author -->
					<div class="inline-flex w-full items-center border-b bg-muted/60 px-4 py-2">
						<Avatar.Root class="mr-2 size-5">
							<Avatar.Image src={prInfo.info.user.avatar_url} alt={prInfo.info.user.login} />
							<Avatar.Fallback>{prInfo.info.user.login.charAt(0).toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
						<span>{prInfo.info.user.login}</span>
						<span class="mx-1 text-muted-foreground">•</span>
						<span class="text-muted-foreground">
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
				<div class="h-fit w-2/5 max-w-xs rounded-xl border px-4 pb-3">
					<h4 class="-mx-4 mb-4 border-b bg-muted/40 px-4 pb-1 pt-3 text-xl font-semibold">Info</h4>
					{#each rightPartInfo as { title, value }, i}
						{#if i > 0}
							<Separator class="my-2" />
						{/if}
						<div class="flex items-center justify-between *:text-nowrap">
							<span class="font-medium">{title}</span>
							<span class="text-muted-foreground">{value}</span>
						</div>
					{/each}
				</div>
			</div>
			<!-- Comments -->
			<BottomCollapsible
				icon={MessagesSquare}
				label="Comments"
				secondaryLabel="{prInfo.info.comments} comment{prInfo.info.comments > 1 ? 's' : ''}"
			>
				{#each prInfo.comments ?? [] as comment, i}
					{#if i > 0}
						<Separator class="my-2" />
					{/if}
					<div>
						<!-- Author -->
						<div class="inline-flex w-full items-center border-b px-4 py-2">
							{#if comment.user}
								<Avatar.Root class="mr-2 size-5">
									<Avatar.Image src={comment.user.avatar_url} alt={comment.user.login} />
									<Avatar.Fallback>
										{comment.user.login.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<span>{comment.user.login}</span>
								<span class="mx-1 text-muted-foreground">•</span>
							{/if}
							<span class="text-muted-foreground">
								{formatToDateTime(comment.created_at)}
							</span>
						</div>
						<!-- Body -->
						<div
							class="prose max-w-full p-4 dark:prose-invert prose-a:no-underline prose-a:underline-offset-4 prose-a:[overflow-wrap:_break-word] hover:prose-a:underline prose-li:my-1"
						>
							<Markdown md={comment.body || "_Empty comment_"} plugins={[gfmPlugin()]} />
						</div>
					</div>
				{/each}
			</BottomCollapsible>
			<!-- Commits -->
			<BottomCollapsible
				icon={GitCommitVertical}
				label="Commits"
				secondaryLabel="{prInfo.info.commits} commit{prInfo.info.commits > 1 ? 's' : ''}"
			>
				<Steps class="my-4">
					{#each prInfo.commits as commit}
						{@const [commitMessage, ...commitDescription] = commit.commit.message.split("\n")}
						<Step>
							<GitCommitVertical class="size-4" slot="stepIcon" />
							<div class="flex items-start justify-between gap-40">
								<!-- Left part: commit message, description & author -->
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<div class="prose dark:prose-invert prose-p:text-foreground">
											<Markdown
												md={commitMessage ?? "_No message provided_"}
												plugins={[gfmPlugin()]}
											/>
										</div>
										{#if commit.author}
											<div class="flex items-center gap-1.5 text-muted-foreground">
												<span>•</span>
												<Avatar.Root class="size-4">
													<Avatar.Image src={commit.author.avatar_url} alt={commit.author.login} />
													<Avatar.Fallback>
														{commit.author.login.charAt(0).toUpperCase()}
													</Avatar.Fallback>
												</Avatar.Root>
												<span>{commit.author.login}</span>
											</div>
										{/if}
									</div>
									{#if commitDescription.length > 0}
										<div class="prose prose-sm max-w-full text-muted-foreground dark:prose-invert">
											<Markdown md={commitDescription.join(" ")} plugins={[gfmPlugin()]} />
										</div>
									{/if}
								</div>
								<!-- Right part: verification badge & sha -->
								<div class="flex items-center gap-2">
									{#if commit.commit.verification?.verified ?? false}
										<Badge variant="outline" class="text-green-500">Verified</Badge>
									{/if}
									{#if commit.sha}
										<span class="font-mono text-muted-foreground">{commit.sha.slice(0, 7)}</span>
									{/if}
								</div>
							</div>
						</Step>
					{/each}
				</Steps>
			</BottomCollapsible>
			<!-- Files -->
			<BottomCollapsible
				icon={FileDiff}
				label="Files"
				secondaryLabel="{prInfo.files.length} file{prInfo.files.length > 1 ? 's' : ''}"
			>
				<div class="flex flex-col gap-1">
					{#each prInfo.files as file}
						<div class="flex items-center justify-between gap-2">
							<span class="inline-flex gap-2">
								{file.filename}
								{#if file.additions > 0}
									<span class="font-semibold text-green-500">+{file.additions}</span>
								{/if}
								{#if file.deletions > 0}
									<span class="font-semibold text-red-500">-{file.deletions}</span>
								{/if}
							</span>
							<span class="text-nowrap text-muted-foreground">{file.changes} changes</span>
						</div>
					{/each}
				</div>
				<div class="mt-4 flex items-center justify-between">
					<span class="font-semibold">Total</span>
					<div class="flex items-center gap-2">
						<span class="font-semibold text-green-500">
							+{prInfo.files.reduce((acc, file) => acc + file.additions, 0)}
						</span>
						<span class="font-semibold text-red-500">
							-{prInfo.files.reduce((acc, file) => acc + file.deletions, 0)}
						</span>
					</div>
				</div>
			</BottomCollapsible>
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
