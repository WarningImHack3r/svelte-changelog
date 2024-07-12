<script lang="ts">
	import type { Issues, LinkedEntity, Pulls } from "./types";
	import ArrowUpRight from "lucide-svelte/icons/arrow-up-right";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import FileDiff from "lucide-svelte/icons/file-diff";
	import GitCommitVertical from "lucide-svelte/icons/git-commit-vertical";
	import MessagesSquare from "lucide-svelte/icons/messages-square";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import Step from "$lib/components/Step.svelte";
	import Steps from "$lib/components/Steps.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import MarkdownRenderer from "./MarkdownRenderer.svelte";

	// Utils
	function formatToDateTime(date: string) {
		return new Intl.DateTimeFormat("en", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(date));
	}

	export let info:
		| Awaited<ReturnType<Pulls["get"]>>["data"]
		| Awaited<ReturnType<Issues["get"]>>["data"];
	export let comments: Awaited<ReturnType<Issues["listComments"]>>["data"];
	export let commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"];
	export let files: Awaited<ReturnType<Pulls["listFiles"]>>["data"];
	export let linkedEntities: LinkedEntity[];

	let type: "issue" | "pull";
	let org: string;
	let repo: string;
	$: if (info.html_url) {
		// https://github.com/ org/repo/[pull|issues]/number
		const [urlOrg, urlRepo, urlType] = info.html_url.replace("https://github.com/", "").split("/");
		org = urlOrg ?? "";
		repo = urlRepo ?? "";
		type = urlType === "pull" ? "pull" : "issue";
	}

	let rightPartInfo: { title: string; value: string }[] = [];
	$: if (info) {
		rightPartInfo = [
			...(info.closed_at
				? [
						{
							title: "merged" in info && info.merged ? "Merged at" : "Closed at",
							value: formatToDateTime(info.closed_at)
						}
					]
				: []),
			{ title: "Assignees", value: info.assignees?.map(a => a.login).join(", ") || "None" },
			...("requested_reviewers" in info
				? [
						{
							title: "Reviewers",
							value: info.requested_reviewers?.map(r => r.login).join(", ") || "None"
						}
					]
				: []),
			{ title: "Labels", value: info.labels?.join(", ") || "None" },
			{ title: "Milestone", value: info.milestone?.title || "None" }
		];
	}
</script>

<!-- TODO: use Shiki for bodies snippets & detailed diff -->

<div class="container py-8">
	<h2 class="group mb-8 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
		<a href={info.html_url}>
			<MarkdownRenderer
				markdown={info.title}
				inline
				class="prose-2xl text-3xl text-foreground group-hover:underline"
			/>
			<span class="ml-1 font-light text-muted-foreground group-hover:underline">#{info.number}</span
			>
		</a>
	</h2>
	{#if linkedEntities.length > 0}
		<h3 class="text-2xl font-semibold tracking-tight">
			{type === "pull" ? "Closing issue" : "Development PR"}{linkedEntities.length > 1 ? "s" : ""}
		</h3>
		<Accordion.Root class="mb-12">
			{#each linkedEntities as entity}
				<Accordion.Item value={entity.number.toString()}>
					<Accordion.Trigger class="group hover:no-underline">
						<!-- Title -->
						<span class="text-left *:group-hover:underline">
							<MarkdownRenderer
								markdown={entity.title}
								inline
								class="leading-normal text-foreground"
							/>
							<span class="ml-1 font-light text-muted-foreground">
								#{entity.number}
							</span>
						</span>
						<!-- Author & Date -->
						<div
							class="ml-auto mr-4 flex items-center gap-2 whitespace-nowrap pl-32 text-right text-sm text-muted-foreground"
						>
							<Avatar.Root class="size-6">
								<Avatar.Image src={entity.author.avatarUrl} alt={entity.author.login} />
								<Avatar.Fallback>
									{entity.author.login.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<span>{entity.author.login}</span>
							<span>•</span>
							<span>{formatToDateTime(entity.createdAt)}</span>
						</div>
					</Accordion.Trigger>
					<!-- Body -->
					<Accordion.Content class="mx-auto w-3/4">
						<MarkdownRenderer markdown={entity.body} class="max-w-full text-base" />
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}
	<div class="flex items-center justify-between">
		<h3 class="text-2xl font-semibold tracking-tight">
			{type === "pull" ? "Pull request" : "Issue"}
		</h3>
		<GHBadge
			{type}
			status={info.closed_at
				? type === "pull" && "merged" in info
					? info.merged
						? "merged"
						: "closed"
					: info.draft
						? "draft"
						: "open"
				: info.state === "closed"
					? "state_reason" in info && info.state_reason === "completed"
						? "solved"
						: "closed"
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
					{#if info.user}
						<a href={info.user.html_url} class="group inline-flex items-center">
							<Avatar.Root class="mr-2 size-5">
								<Avatar.Image
									src={info.user.avatar_url}
									alt={info.user.login}
									class="group-hover:opacity-75"
								/>
								<Avatar.Fallback>
									{info.user.login.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="group-hover:underline">{info.user.login}</span>
						</a>
						<span class="mx-1 text-muted-foreground">•</span>
					{/if}
					<span class="text-muted-foreground">
						{formatToDateTime(info.created_at)}
					</span>
				</div>
				<!-- Body -->
				<div class="p-4">
					<MarkdownRenderer
						markdown={info.body || "_No description provided_"}
						class="max-w-full"
					/>
				</div>
			</div>
			<!-- Right part - info -->
			<div class="h-fit w-2/5 max-w-xs rounded-xl border px-4 pb-3">
				<h4 class="-mx-4 mb-4 border-b bg-muted/40 px-4 pb-1 pt-2 text-xl font-semibold">Info</h4>
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
			secondaryLabel="{info.comments} comment{info.comments > 1 ? 's' : ''}"
		>
			{#each comments as comment, i}
				{#if i > 0}
					<Separator class="my-2 h-1" />
				{/if}
				<div>
					<!-- Author -->
					<div class="inline-flex w-full items-center border-b px-4 py-2">
						{#if comment.user}
							<a href={comment.user.html_url} class="group inline-flex items-center">
								<Avatar.Root class="mr-2 size-5">
									<Avatar.Image
										src={comment.user.avatar_url}
										alt={comment.user.login}
										class="group-hover:opacity-75"
									/>
									<Avatar.Fallback>
										{comment.user.login.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="group-hover:underline">{comment.user.login}</span>
							</a>
							<span class="mx-1 text-muted-foreground">•</span>
						{/if}
						<span class="text-muted-foreground">
							{formatToDateTime(comment.created_at)}
						</span>
					</div>
					<!-- Body -->
					<div class="p-4">
						<MarkdownRenderer markdown={comment.body || "_Empty comment_"} class="w-full" />
					</div>
				</div>
			{/each}
		</BottomCollapsible>
		<!-- Commits -->
		{#if type === "pull"}
			<BottomCollapsible
				icon={GitCommitVertical}
				label="Commits"
				secondaryLabel="{commits.length} commit{commits.length > 1 ? 's' : ''}"
			>
				<Steps class="my-4">
					{#each commits as commit}
						{@const [commitMessage, ...commitDescription] = commit.commit.message.split("\n")}
						<Step>
							<GitCommitVertical class="size-4" slot="stepIcon" />
							<div class="flex items-start justify-between gap-40">
								<!-- Left part: commit message, description & author -->
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<a href={commit.url} class="hover:underline">
											<MarkdownRenderer
												markdown={commitMessage ?? "_No message provided_"}
												class="prose-p:text-foreground"
											/>
										</a>
										{#if commit.author}
											<div class="flex items-center gap-1.5 text-muted-foreground">
												<span>•</span>
												<a
													href={commit.author.html_url}
													class="group inline-flex items-center gap-1.5"
												>
													<Avatar.Root class="size-4">
														<Avatar.Image
															src={commit.author.avatar_url}
															alt={commit.author.login}
															class="group-hover:opacity-75"
														/>
														<Avatar.Fallback>
															{commit.author.login.charAt(0).toUpperCase()}
														</Avatar.Fallback>
													</Avatar.Root>
													<span class="group-hover:underline">{commit.author.login}</span>
												</a>
											</div>
										{/if}
									</div>
									{#if commitDescription.length > 0}
										<MarkdownRenderer
											markdown={commitDescription.join(" ")}
											class="prose-sm max-w-full text-muted-foreground"
										/>
									{/if}
								</div>
								<!-- Right part: verification badge & sha -->
								<div class="flex items-center gap-2">
									{#if commit.commit.verification?.verified ?? false}
										<Badge variant="outline" class="text-green-500">Verified</Badge>
									{/if}
									{#if commit.sha}
										<Tooltip.Root openDelay={300}>
											<Tooltip.Trigger>
												<span class="font-mono text-muted-foreground">
													{commit.sha.slice(0, 7)}
												</span>
											</Tooltip.Trigger>
											<Tooltip.Content>
												<span class="font-mono">{commit.sha}</span>
											</Tooltip.Content>
										</Tooltip.Root>
									{/if}
								</div>
							</div>
						</Step>
					{/each}
				</Steps>
			</BottomCollapsible>
		{/if}
		<!-- Files -->
		{#if type === "pull"}
			<BottomCollapsible
				icon={FileDiff}
				label="Files"
				secondaryLabel="{files.length} file{files.length > 1 ? 's' : ''}"
			>
				<div class="flex flex-col gap-1">
					{#each files as file}
						<div class="flex items-center justify-between gap-2">
							<a href={file.blob_url} class="inline-flex gap-2 *:hover:underline">
								<span>{file.filename}</span>
								{#if file.additions > 0}
									<span class="font-semibold text-green-500">+{file.additions}</span>
								{/if}
								{#if file.deletions > 0}
									<span class="font-semibold text-red-500">-{file.deletions}</span>
								{/if}
							</a>
							<span class="text-nowrap text-muted-foreground">{file.changes} changes</span>
						</div>
					{/each}
				</div>
				<div class="mt-4 flex items-center justify-between">
					<span class="font-semibold">Total</span>
					<div class="flex items-center gap-2">
						<span class="font-semibold text-green-500">
							+{files.reduce((acc, file) => acc + file.additions, 0)}
						</span>
						<span class="font-semibold text-red-500">
							-{files.reduce((acc, file) => acc + file.deletions, 0)}
						</span>
					</div>
				</div>
			</BottomCollapsible>
		{/if}
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
			{#each linkedEntities as closingIssue}
				<Button
					href="/{type === 'pull' ? 'issues' : 'pull'}/{org}/{repo}/{closingIssue.number}"
					variant="link"
				>
					Open {type === "pull" ? "issue" : "pull request"} #{closingIssue.number}
				</Button>
			{/each}
			<Button href={info.html_url} target="_blank" class="group dark:text-black">
				Open {type === "pull" ? "pull request" : "issue"} on GitHub
				<ArrowUpRight
					class="ml-2 size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
				/>
			</Button>
		</div>
	</div>
</div>