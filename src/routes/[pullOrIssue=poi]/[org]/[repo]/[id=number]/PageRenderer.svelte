<script module>
	import { createHighlighterCoreSync } from "shiki";
	import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
	import svelte from "@shikijs/langs/svelte";
	import typescript from "@shikijs/langs/typescript";
	import javascript from "@shikijs/langs/javascript";
	import html from "@shikijs/langs/html";
	import css from "@shikijs/langs/css";
	import json from "@shikijs/langs/json";
	import shell from "@shikijs/langs/shell";
	import githubLight from "@shikijs/themes/github-light-default";
	import githubDark from "@shikijs/themes/github-dark-default";

	const highlighter = createHighlighterCoreSync({
		langs: [svelte, typescript, javascript, html, css, json, shell],
		themes: [githubLight, githubDark],
		engine: createJavaScriptRegexEngine()
	});
</script>

<script lang="ts">
	import type { Issues, LinkedEntity, Pulls } from "./types";
	import {
		ArrowUpRight,
		ChevronLeft,
		FileDiff,
		GitCommitVertical,
		MessagesSquare
	} from "@lucide/svelte";
	import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
	import type { Plugin } from "svelte-exmarkdown";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Step from "$lib/components/Step.svelte";
	import Steps from "$lib/components/Steps.svelte";
	import BodyRenderer from "$lib/components/renderers/BodyRenderer.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";

	const shikiPlugin: Plugin = {
		rehypePlugin: [
			rehypeShikiFromHighlighter,
			highlighter,
			{ themes: { light: "github-light-default", dark: "github-dark-default" } }
		]
	};

	// Utils
	function formatToDateTime(date: string) {
		return new Intl.DateTimeFormat("en", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(date));
	}

	type Props = {
		info: Awaited<ReturnType<Pulls["get"]>>["data"] | Awaited<ReturnType<Issues["get"]>>["data"];
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"];
		commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"];
		files: Awaited<ReturnType<Pulls["listFiles"]>>["data"];
		linkedEntities: LinkedEntity[];
	};

	let { info, comments, commits, files, linkedEntities }: Props = $props();

	// https://github.com/ org/repo/[pull|issues]/number
	let org = $derived(info.html_url?.replace("https://github.com/", "").split("/")[0] ?? "");
	let repo = $derived(info.html_url?.replace("https://github.com/", "").split("/")[1] ?? "");
	let type = $derived.by(() => {
		if (!info.html_url) return "issue" as const;
		return info.html_url.replace("https://github.com/", "").split("/")[2] === "pull"
			? ("pull" as const)
			: ("issue" as const);
	});

	let rightPartInfo = $derived.by(() => {
		if (info) {
			return [
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
				{
					title: "Labels",
					value: info.labels?.map(l => (typeof l === "string" ? l : l.name)).join(", ") || "None"
				},
				{ title: "Milestone", value: info.milestone?.title || "None" }
			];
		}
		return [];
	});
</script>

<div class="container py-8">
	<h2 class="group mb-8 scroll-m-20 border-b pb-2 font-semibold tracking-tight xs:text-3xl">
		<a href={info.html_url}>
			<MarkdownRenderer
				markdown={info.title}
				inline
				class="prose-xl text-foreground group-hover:underline xs:prose-2xl xs:text-3xl"
			/>
			<span class="ml-1 font-light text-muted-foreground group-hover:underline">#{info.number}</span
			>
		</a>
	</h2>
	{#if linkedEntities.length > 0}
		<h3 class="text-2xl font-semibold tracking-tight">
			{type === "pull" ? "Closing issue" : "Development PR"}{linkedEntities.length > 1 ? "s" : ""}
		</h3>
		<Accordion.Root type="single" class="mb-12">
			{#each linkedEntities as entity (entity.number)}
				<Accordion.Item value={entity.number.toString()}>
					<Accordion.Trigger class="group hover:no-underline [&>svg:last-child]:flex-shrink-0">
						<div class="mr-2 flex w-full flex-col gap-4 xs:gap-2 md:flex-row md:gap-14">
							<!-- Title -->
							<span class="text-left group-hover:*:underline">
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
								class="mr-4 flex flex-shrink-0 flex-col items-end gap-1 text-right text-sm text-muted-foreground xs:ml-auto xs:flex-row xs:items-center"
							>
								{#if "author" in entity}
									<div class="flex items-center gap-2">
										<Avatar.Root class="size-6">
											<Avatar.Image src={entity.author?.avatarUrl} alt={entity.author?.login} />
											<Avatar.Fallback>
												{entity.author?.login.charAt(0).toUpperCase()}
											</Avatar.Fallback>
										</Avatar.Root>
										<span class="font-semibold">{entity.author?.login}</span>
									</div>
									<span class="hidden xs:block">•</span>
								{/if}
								{#if "createdAt" in entity}
									<span>{formatToDateTime(entity.createdAt)}</span>
								{/if}
							</div>
						</div>
					</Accordion.Trigger>
					<!-- Body -->
					<Accordion.Content class="mx-auto sm:w-3/4">
						<MarkdownRenderer
							markdown={entity.body || "_No description provided_"}
							parseRawHtml
							class="max-w-full text-base"
							additionalPlugins={[shikiPlugin]}
						/>
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
			status={info.state === "closed"
				? "merged" in info
					? info.merged
						? "merged"
						: "closed"
					: "state_reason" in info && info.state_reason === "completed"
						? "solved"
						: "closed"
				: info.draft
					? "draft"
					: "open"}
		/>
	</div>
	<div class="mt-4 flex flex-col gap-4">
		<!-- Info -->
		<div
			class="mb-8 flex w-full flex-col justify-center gap-8 *:h-fit *:rounded-xl *:border md:flex-row"
		>
			<!-- Left part - body -->
			<div class="flex-1 bg-muted/30">
				<!-- Author -->
				<div
					class="inline-flex w-full flex-col gap-1 border-b bg-muted/60 px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
				>
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
							<span class="font-semibold group-hover:underline">{info.user.login}</span>
						</a>
						<span class="mx-1 hidden text-muted-foreground xs:block">•</span>
					{/if}
					<span class="text-muted-foreground">
						{formatToDateTime(info.created_at)}
					</span>
				</div>
				<!-- Body -->
				<div class="p-4">
					<MarkdownRenderer
						markdown={info.body || "_No description provided_"}
						parseRawHtml
						class="max-w-full"
						additionalPlugins={[{ renderer: { p: BodyRenderer } }, shikiPlugin]}
					/>
				</div>
			</div>
			<!-- Right part - info -->
			<div class="px-4 pb-3 md:w-2/5 md:max-w-xs md:min-w-72">
				<h4 class="-mx-4 mb-4 border-b bg-muted/40 px-4 pt-2 pb-1 text-xl font-semibold">Info</h4>
				{#each rightPartInfo as { title, value }, i (title)}
					{#if i > 0}
						<Separator class="my-2" />
					{/if}
					<div class="flex items-center justify-between gap-2">
						<span class="font-medium">{title}</span>
						<span class="text-right text-muted-foreground">{value}</span>
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
			{#each comments as comment, i (comment.id)}
				{#if i > 0}
					<Separator class="my-2 h-1" />
				{/if}
				<div>
					<!-- Author -->
					<div
						class="inline-flex w-full flex-col gap-1 border-b px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
					>
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
								<span class="font-semibold group-hover:underline">{comment.user.login}</span>
							</a>
							<span class="mx-1 hidden text-muted-foreground xs:block">•</span>
						{/if}
						<span class="text-muted-foreground">
							{formatToDateTime(comment.created_at)}
						</span>
					</div>
					<!-- Body -->
					<div class="p-4">
						<MarkdownRenderer
							markdown={comment.body || "_Empty comment_"}
							parseRawHtml
							class="w-full"
						/>
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
					{#each commits as commit (commit.sha)}
						{@const [commitMessage, ...commitDescription] = commit.commit.message.split("\n")}
						<Step icon={GitCommitVertical}>
							<div class="flex flex-col-reverse items-start justify-between sm:flex-row sm:gap-16">
								<!-- Left part: commit message, description & author -->
								<div class="flex flex-col gap-1">
									<div>
										<a href={commit.html_url} class="hover:underline">
											<MarkdownRenderer
												markdown={commitMessage ?? "_No message provided_"}
												inline
												class="prose-p:text-foreground"
											/>
										</a>
										{#if commit.author}
											<div class="ml-0.5 inline-flex items-center gap-1.5 text-muted-foreground">
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
													<span class="font-semibold group-hover:underline">
														{commit.author.login}
													</span>
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
										<Tooltip.Provider>
											<Tooltip.Root delayDuration={300}>
												<Tooltip.Trigger>
													<span class="font-mono text-muted-foreground">
														{commit.sha.slice(0, 7)}
													</span>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<span class="font-mono">{commit.sha}</span>
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
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
			<!-- TODO: detailed diff? -->
			<BottomCollapsible
				icon={FileDiff}
				label="Files"
				secondaryLabel="{files.length} file{files.length > 1 ? 's' : ''}"
			>
				<div class="flex flex-col gap-2">
					{#each files as file (file.sha)}
						<div
							class="flex flex-col items-start justify-between xs:flex-row xs:items-center xs:gap-4"
						>
							<a href={file.blob_url} class="inline-block hover:*:underline">
								<span class="[overflow-wrap:_anywhere]">{file.filename}</span>
								{#if file.additions > 0}
									<span class="font-semibold text-green-500">+{file.additions}</span>
								{/if}
								{#if file.deletions > 0}
									<span class="font-semibold text-red-500">-{file.deletions}</span>
								{/if}
							</a>
							<span class="flex-shrink-0 text-right text-muted-foreground">
								{file.changes} changes
							</span>
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
	<div class="mt-16 flex w-full flex-col-reverse justify-between gap-8 md:flex-row md:items-center">
		<Button href="/" variant="link" class="group mr-auto md:mr-0">
			<ChevronLeft
				class="mr-1 size-4 transition-transform duration-300 group-hover:-translate-x-1"
			/>
			Back to homepage
		</Button>
		<div class="flex flex-col-reverse items-end gap-4 md:flex-row md:items-center">
			<div class="flex flex-wrap justify-end gap-4">
				{#each linkedEntities as closingIssue (closingIssue.id)}
					<Button
						href="/{type === 'pull' ? 'issues' : 'pull'}/{org}/{repo}/{closingIssue.number}"
						variant="secondary"
					>
						Open {type === "pull" ? "issue" : "pull request"} #{closingIssue.number}
					</Button>
				{/each}
			</div>
			<Button href={info.html_url} target="_blank" class="group dark:text-black">
				Open {type === "pull" ? "pull request" : "issue"} on GitHub
				<ArrowUpRight
					class="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
				/>
			</Button>
		</div>
	</div>
</div>

<style>
	:global(html.dark .shiki),
	:global(html.dark .shiki span) {
		color: var(--shiki-dark) !important;
		background-color: var(--shiki-dark-bg) !important;
		/* Optional, if you also want font styles */
		font-style: var(--shiki-dark-font-style) !important;
		font-weight: var(--shiki-dark-font-weight) !important;
		text-decoration: var(--shiki-dark-text-decoration) !important;
	}
</style>
