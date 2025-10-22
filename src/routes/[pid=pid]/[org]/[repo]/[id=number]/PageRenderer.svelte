<script module>
	import css from "@shikijs/langs/css";
	import diff from "@shikijs/langs/diff";
	import html from "@shikijs/langs/html";
	import javascript from "@shikijs/langs/javascript";
	import json from "@shikijs/langs/json";
	import shell from "@shikijs/langs/shell";
	import svelte from "@shikijs/langs/svelte";
	import typescript from "@shikijs/langs/typescript";
	import githubDark from "@shikijs/themes/github-dark-default";
	import githubLight from "@shikijs/themes/github-light-default";
	import { createHighlighterCoreSync } from "shiki";
	import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
	import { loadLanguages } from "./syntax-highlighting";

	const highlighter = createHighlighterCoreSync({
		langs: [svelte, typescript, javascript, html, css, json, shell, diff],
		themes: [githubLight, githubDark],
		engine: createJavaScriptRegexEngine()
	});

	const loadedLanguages = loadLanguages({
		svelte,
		typescript,
		javascript,
		html,
		css,
		json,
		shell,
		diff
	});
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import type { HTMLAttributes, SvelteHTMLElements } from "svelte/elements";
	import { MediaQuery, SvelteMap } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { browser } from "$app/environment";
	import { resolve } from "$app/paths";
	import { navigating, page } from "$app/state";
	import {
		ArrowUpRight,
		ChevronLeft,
		FileDiff,
		GitCommitVertical,
		Lock,
		MessagesSquare,
		Tag
	} from "@lucide/svelte";
	import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
	import rehypeSlug from "rehype-slug";
	import remarkGemoji from "remark-gemoji";
	import remarkGithub from "remark-github";
	import type { Plugin } from "svelte-exmarkdown";
	import type {
		DiscussionDetails,
		IssueDetails,
		LinkedItem,
		PullRequestDetails
	} from "$lib/server/github-cache";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Alert from "$lib/components/ui/alert";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import Step from "$lib/components/Step.svelte";
	import Steps from "$lib/components/Steps.svelte";
	import LinkRenderer from "$lib/components/renderers/LinkRenderer.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import {
		transformerDiffMarking,
		transformerLanguageDetection,
		transformerTrimCode
	} from "./syntax-highlighting";

	const shikiPlugin: Plugin = {
		rehypePlugin: [
			rehypeShikiFromHighlighter,
			highlighter,
			{
				themes: { light: "github-light-default", dark: "github-dark-default" },
				transformers: [
					transformerTrimCode,
					transformerLanguageDetection(loadedLanguages),
					transformerDiffMarking
				]
			} satisfies Parameters<typeof rehypeShikiFromHighlighter>[1]
		]
	};

	function formatToDateTime(date: string) {
		return new Intl.DateTimeFormat("en", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(date));
	}

	type Props = {
		metadata: {
			org: string;
			repo: string;
			type: "pull" | "issue" | "discussion";
		};
		info: IssueDetails["info"] | PullRequestDetails["info"] | DiscussionDetails["info"];
		comments: IssueDetails["comments"] | DiscussionDetails["comments"];
		commits: PullRequestDetails["commits"];
		files: PullRequestDetails["files"];
		linkedEntities: LinkedItem[];
		mergedTagName: Promise<[string, string] | undefined>;
	};

	let { metadata, info, comments, commits, files, linkedEntities, mergedTagName }: Props = $props();

	let rightPartInfo = $derived<{ title: string; value: string }[]>([
		...("answer_chosen_at" in info && info.answer_chosen_at
			? [{ title: "Answered at", value: formatToDateTime(info.answer_chosen_at) }]
			: []),
		...("answer_chosen_by" in info && info.answer_chosen_by
			? [{ title: "Answered by", value: info.answer_chosen_by.login }]
			: []),
		...("category" in info ? [{ title: "Category", value: info.category.name }] : []),
		...("closed_at" in info && info.closed_at
			? [
					{
						title: "merged" in info && info.merged ? "Merged at" : "Closed at",
						value: formatToDateTime(info.closed_at)
					}
				]
			: []),
		...("closed_at" in info && info.closed_at && "merged" in info && info.merged
			? [
					{
						title: "Merged by",
						value: info.merged_by?.name ?? info.merged_by?.login ?? "Unknown"
					}
				]
			: []),
		...("assignees" in info
			? [
					{
						title: "Assignees",
						value: info.assignees?.map(a => a.login).join(", ") || "None"
					}
				]
			: []),
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
		...("milestone" in info
			? [
					{
						title: "Milestone",
						value: info.milestone?.title || "None"
					}
				]
			: [])
	]);

	// Hash management
	let wantsReducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
	$effect(() => {
		if (!page.url.hash || navigating.to || untrack(() => scrollY.current ?? 0) > 0) return;

		document
			.getElementById(page.url.hash.slice(1))
			?.scrollIntoView({ behavior: wantsReducedMotion.current ? undefined : "smooth" });
	});

	/**
	 * Sort comments for discussions so that they simply have to be indented
	 * if answers to properly look like threads of comments.
	 *
	 * @param comments the input comments
	 * @returns the sorted comments
	 */
	function sortComments(comments: Props["comments"]): Props["comments"] {
		// Check if the array contains discussion items (with `parent_id`)
		// We only need to check the first item since we know all items are of the same type
		const hasParentId = comments[0] && "parent_id" in comments[0];

		// If these are simple items, sort by date and return
		if (!hasParentId) {
			return (comments as IssueDetails["comments"]).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		}

		// We know we're dealing with TreeItems at this point
		const discussionComments = comments as DiscussionDetails["comments"];

		// Create a map to store children by their parent_id for quick lookups
		const childrenMap = new SvelteMap<
			DiscussionDetails["comments"][number]["parent_id"],
			DiscussionDetails["comments"]
		>();

		// Populate the map
		for (const comment of discussionComments) {
			if (!childrenMap.has(comment.parent_id)) {
				childrenMap.set(comment.parent_id, []);
			}
			childrenMap.get(comment.parent_id)?.push(comment);
		}

		// Sort children arrays by creation date
		for (const children of childrenMap.values()) {
			children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
		}

		// Recursively build the result array in the correct order
		const result: DiscussionDetails["comments"] = [];

		function traverseTree(parentId: DiscussionDetails["comments"][number]["parent_id"]) {
			const children = childrenMap.get(parentId) || [];

			for (const child of children) {
				result.push(child);
				traverseTree(child.id);
			}
		}

		// Start traversal from the root
		traverseTree(null);

		return result;
	}

	/**
	 * Linkify the commit message by wrapping all its non-link text inside
	 * markdown links if it already contains a link
	 *
	 * @param message the commit message
	 * @param wrapperUrl the wrapper link to wrap the rest of the message with
	 * @returns the formatted commit message
	 */
	function formatCommitMessage(message: string | null | undefined, wrapperUrl: string) {
		if (!message) return `[_No message provided_](${wrapperUrl})`;
		message = message
			.replace(/(https?:\/\/[^ ]+)/g, `[$1]($1)`)
			.replace(
				/\(#(\d+)\)/g,
				`([#$1](https://github.com/${metadata.org}/${metadata.repo}/issues/$1))`
			);
		const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
		const links: { index: number; length: number }[] = [];
		let match;

		while ((match = linkRegex.exec(message)) !== null) {
			links.push({
				index: match.index,
				length: match[0].length
			});
		}

		if (!links.length) return `[${message}](${wrapperUrl})`;

		let result = "";
		let lastIndex = 0;

		for (const link of links) {
			const textBefore = message.slice(lastIndex, link.index);
			if (textBefore.trim()) {
				result += `[${textBefore}](${wrapperUrl})`;
			}
			lastIndex = link.index + link.length;
			result += message.slice(link.index, lastIndex);
		}

		const textAfter = message.slice(lastIndex);
		if (textAfter.trim()) {
			result += `[${textAfter}](${wrapperUrl})`;
		}

		return result;
	}

	/**
	 * Returns the previous page to go back to
	 */
	function getPreviousPath() {
		if (!browser || !document.referrer) return resolve("/");
		return new URL(document.referrer).pathname;
	}
</script>

{#snippet headingRenderer(
	heading: Extract<keyof SvelteHTMLElements, `h${number}`> | (string & {}),
	{ children, id, class: className, ...props }: HTMLAttributes<HTMLHeadingElement>
)}
	{@const shouldRender = metadata.type === "discussion" && id}
	<svelte:element
		this={heading}
		id={shouldRender ? id : undefined}
		class={[className, shouldRender && "group scroll-mt-20"]}
		{...props}
	>
		{@render children?.()}
		{#if shouldRender}
			<a href="#{id}" class="transition-colors not-group-hover:text-muted-foreground/50">#</a>
		{/if}
	</svelte:element>
{/snippet}

<h2 class="group mb-8 scroll-m-20 border-b pb-2 text-2xl font-semibold xs:text-3xl">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={info.html_url}>
		<MarkdownRenderer
			markdown={info.title}
			inline
			class="prose-xl text-2xl text-foreground group-hover:underline xs:prose-2xl xs:text-3xl"
		/>
		<span class="ml-1 font-light text-muted-foreground group-hover:underline">#{info.number}</span>
	</a>
</h2>
{#if linkedEntities.length > 0}
	<h3 class="font-display text-2xl font-semibold tracking-tight">
		{metadata.type === "pull" ? "Closing issue" : "Development PR"}{linkedEntities.length > 1
			? "s"
			: ""}
	</h3>
	<Accordion.Root type="single" class="mb-12">
		{#each linkedEntities as entity (entity.number)}
			<Accordion.Item value={`${entity.number}`}>
				<Accordion.Trigger class="group hover:no-underline [&>svg:last-child]:shrink-0">
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
						additionalPlugins={[
							{
								remarkPlugin: [
									remarkGithub,
									{ repository: `${entity.repository.owner}/${entity.repository.name}` }
								]
							},
							{ remarkPlugin: remarkGemoji },
							shikiPlugin
						]}
					/>
					<Reactions reactions={entity.reactions} reactionItemUrl={entity.html_url} class="mt-4" />
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
{/if}
<div class="flex items-center">
	<h3 class="font-display text-2xl font-semibold tracking-tight">
		{metadata.type === "pull" ? "Pull request" : metadata.type === "issue" ? "Issue" : "Discussion"}
	</h3>
	{#if info.locked}
		<div
			class="ml-auto flex items-center rounded-full bg-neutral-500/70 px-2 py-2 text-white xs:px-4 dark:bg-neutral-500/50"
		>
			<Lock class="size-5" />
			<span class="ml-2 hidden font-semibold xs:inline">Locked</span>
		</div>
	{/if}
	{#key info}
		<GHBadge
			type={metadata.type}
			status={info.state === "closed"
				? "merged" in info
					? info.merged
						? "merged"
						: "closed"
					: "state_reason" in info && info.state_reason === "completed"
						? "solved"
						: "closed"
				: "draft" in info && info.draft
					? "draft"
					: "open"}
			class={{ "ml-auto": !info.locked, "ml-3 xs:ml-4": info.locked }}
		/>
	{/key}
</div>
<div class="mt-4 flex flex-col gap-4">
	<!-- Info -->
	<div class="mb-8 flex w-full flex-col justify-center gap-8 *:h-fit md:flex-row">
		<!-- Left part - body -->
		<div class="flex-1 rounded-md border bg-background">
			<!-- Author -->
			<div
				class="inline-flex w-full flex-col gap-1 border-b bg-muted/60 px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
			>
				{#if info.user}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
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
			<div class="bg-muted/30 p-4">
				<MarkdownRenderer
					markdown={info.body || "_No description provided_"}
					parseRawHtml
					class="max-w-full"
					additionalPlugins={[
						{ remarkPlugin: [remarkGithub, { repository: `${metadata.org}/${metadata.repo}` }] },
						{ remarkPlugin: remarkGemoji },
						{ rehypePlugin: rehypeSlug },
						shikiPlugin
					]}
				>
					{#snippet h1(props)}
						{@render headingRenderer("h1", props)}
					{/snippet}
					{#snippet h2(props)}
						{@render headingRenderer("h2", props)}
					{/snippet}
					{#snippet h3(props)}
						{@render headingRenderer("h3", props)}
					{/snippet}
					{#snippet h4(props)}
						{@render headingRenderer("h4", props)}
					{/snippet}
					{#snippet h5(props)}
						{@render headingRenderer("h5", props)}
					{/snippet}
					{#snippet h6(props)}
						{@render headingRenderer("h6", props)}
					{/snippet}
					{#snippet a(props)}
						<LinkRenderer attributes={props} />
					{/snippet}
				</MarkdownRenderer>
				{#if "reactions" in info}
					<Reactions reactions={info.reactions} reactionItemUrl={info.html_url} class="mt-4" />
				{/if}
			</div>
		</div>
		<!-- Right part - info -->
		<div class="flex flex-col gap-4 md:w-2/5 md:max-w-xs md:min-w-72">
			<div class="rounded-md border bg-background px-4 pb-3">
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
			{#await mergedTagName then mergedTag}
				{#if mergedTag}
					{@const [tagName, tagVersion] = mergedTag}
					<div class="bg-background">
						<Alert.Root class="rounded-md border-green-500 bg-green-400/10">
							<Tag class="size-4" />
							<Alert.Description class="inline text-foreground">
								This pull request was released in
								<Button
									variant="link"
									href={resolve("/package/[...package]", {
										package: tagName
									}) + `#${tagVersion}`}
									class="h-auto p-0 text-green-500"
								>
									{tagName}
									{tagVersion}
								</Button>
							</Alert.Description>
						</Alert.Root>
					</div>
				{/if}
			{/await}
		</div>
	</div>
	<!-- Comments -->
	{#if comments.length}
		<BottomCollapsible
			icon={MessagesSquare}
			label="Comments"
			secondaryLabel="{info.comments} comment{info.comments > 1 ? 's' : ''}"
		>
			{#each sortComments(comments) as comment, i (comment.id)}
				{@const isAnswer =
					"parent_id" in comment && comment.parent_id ? comment.parent_id !== info.id : false}
				{#if !isAnswer && i > 0}
					<Separator class="my-2 h-1" />
				{/if}
				<div class={[isAnswer && "ml-4 border-l-4 pl-2"]}>
					<!-- Author -->
					<div
						class="inline-flex w-full flex-col gap-1 border-b px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
					>
						{#if comment.user}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
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
							class="max-w-none"
							additionalPlugins={[
								{
									remarkPlugin: [remarkGithub, { repository: `${metadata.org}/${metadata.repo}` }]
								},
								{ remarkPlugin: remarkGemoji },
								shikiPlugin
							]}
						>
							{#snippet a(props)}
								<LinkRenderer attributes={props} />
							{/snippet}
						</MarkdownRenderer>
						<Reactions
							reactions={comment.reactions}
							reactionItemUrl={comment.html_url}
							class="mt-4"
						/>
					</div>
				</div>
			{/each}
		</BottomCollapsible>
	{/if}
	<!-- Commits -->
	{#if metadata.type === "pull"}
		<BottomCollapsible
			icon={GitCommitVertical}
			label="Commits"
			secondaryLabel="{commits.length} commit{commits.length > 1 ? 's' : ''}"
		>
			<Steps class="my-4">
				{#each commits as commit (commit.sha)}
					{@const [commitMessage, ...commitDescriptions] = commit.commit.message.split("\n")}
					{@const commitDescription = commitDescriptions.join("\n").trim()}
					{@const formattedCommitMessage = formatCommitMessage(commitMessage, commit.html_url)}
					<Step icon={GitCommitVertical}>
						<div class="flex flex-col-reverse items-start justify-between sm:flex-row sm:gap-16">
							<!-- Left part: commit message, description & author -->
							<div class="flex flex-col gap-1">
								<div>
									<MarkdownRenderer
										markdown={formattedCommitMessage}
										inline
										class="prose-p:text-foreground prose-a:hover:underline prose-a:[[href*='/commit/']]:text-foreground"
									/>
									{#if commit.author}
										<!-- const to be able to disable eslint without getting owned by prettier wrapping stuff -->
										{@const authorProfile = commit.author.html_url}
										<div class="ml-0.5 inline-flex items-center gap-1.5 text-muted-foreground">
											<span>•</span>
											<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
											<a href={authorProfile} class="group inline-flex items-center gap-1.5">
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
										{#if commit.commit.author?.date}
											<span class="text-muted-foreground">
												• {formatToDateTime(commit.commit.author.date)}
											</span>
										{/if}
									{/if}
								</div>
								{#if commitDescriptions.length}
									<pre class="text-sm text-wrap text-muted-foreground">{commitDescription}</pre>
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
											<Tooltip.Content
												class="border bg-popover text-popover-foreground"
												arrowClasses="bg-popover border-b border-r"
											>
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
	{#if metadata.type === "pull"}
		<BottomCollapsible
			icon={FileDiff}
			label="Files"
			secondaryLabel="{files.length} file{files.length > 1 ? 's' : ''}"
		>
			<div class="flex flex-col gap-2">
				{#each files as file (file.filename)}
					<div
						class="flex flex-col items-start justify-between xs:flex-row xs:items-center xs:gap-4"
					>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href={file.blob_url} class="inline-block hover:*:underline">
							<span class="[overflow-wrap:_anywhere]">{file.filename}</span>
							{#if file.additions > 0}
								<span class="font-semibold text-green-500">+{file.additions}</span>
							{/if}
							{#if file.deletions > 0}
								<span class="font-semibold text-destructive">-{file.deletions}</span>
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
					<span class="font-semibold text-destructive">
						-{files.reduce((acc, file) => acc + file.deletions, 0)}
					</span>
				</div>
			</div>
		</BottomCollapsible>
	{/if}
</div>
<!-- Bottom links -->
<div class="mt-16 flex w-full flex-col-reverse justify-between gap-8 md:flex-row md:items-center">
	<Button href={getPreviousPath()} variant="link" class="group mr-auto gap-0 md:mr-0">
		<ChevronLeft class="mr-1 size-4 transition-transform duration-300 group-hover:-translate-x-1" />
		Back
		{#if getPreviousPath() === resolve("/")}
			to homepage
		{/if}
	</Button>
	<div class="flex flex-col-reverse items-end gap-4 md:flex-row md:items-center">
		{#if linkedEntities.length > 0}
			<div class="flex flex-wrap justify-end gap-4">
				{#each linkedEntities as closingIssue (closingIssue.number)}
					<AnimatedButton
						href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
							pid: metadata.type === "pull" ? "issues" : "pull",
							org: closingIssue.repository.owner,
							repo: closingIssue.repository.name,
							id: `${closingIssue.number}`
						})}
						variant="secondary"
					>
						Open {metadata.type === "pull" ? "issue" : "pull request"}
						{#if closingIssue.repository.owner === metadata.org && closingIssue.repository.name === metadata.repo}
							#{closingIssue.number}
						{:else}
							{closingIssue.repository.owner}/{closingIssue.repository.name}#{closingIssue.number}
						{/if}
					</AnimatedButton>
				{/each}
			</div>
		{/if}
		<AnimatedButton href={info.html_url} target="_blank" class="group gap-0 dark:text-black">
			Open {metadata.type === "pull"
				? "pull request"
				: metadata.type === "issue"
					? "issue"
					: "discussion"} on GitHub
			<ArrowUpRight
				class="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
			/>
		</AnimatedButton>
	</div>
</div>

<style>
	:global(html.dark .shiki),
	:global(html.dark .shiki span) {
		color: var(--shiki-dark) !important;
		font-style: var(--shiki-dark-font-style) !important;
		font-weight: var(--shiki-dark-font-weight) !important;
		text-decoration: var(--shiki-dark-text-decoration) !important;
	}

	:global(html.dark .shiki),
	:global(html.dark .shiki .line:not(.diff) span) {
		background-color: var(--shiki-dark-bg) !important;
	}

	:global {
		.shiki {
			position: relative;

			/* Line numbers, credit to https://github.com/shikijs/shiki/issues/3#issuecomment-830564854 */
			code {
				counter-reset: step;
				counter-increment: step 0;

				.line::before {
					content: counter(step);
					counter-increment: step;
					width: 1rem;
					margin-right: 1.5rem;
					display: inline-block;
					text-align: right;
					white-space: nowrap;
					color: color-mix(in oklab, var(--color-muted-foreground) 70%, transparent);
				}

				/* Diff marks */
				.diff {
					display: inline-block;
					transition: background-color 0.5s;

					&::after {
						content: "";
						position: absolute;
						left: 0;
						width: 100%;
						height: 1lh;
					}

					&.add {
						&::after {
							background-color: color-mix(
								in oklab,
								var(--color-green-500) 15%,
								transparent
							) !important;
						}

						span:first-child::before {
							content: "+";
							color: var(--color-green-500);
						}
					}

					&.remove {
						&::after {
							background-color: color-mix(
								in oklab,
								var(--color-destructive) 15%,
								transparent
							) !important;
						}

						span {
							opacity: 0.7;
						}

						span:first-child::before {
							content: "-";
							font-weight: bold;
							color: var(--color-destructive);
						}
					}

					span:first-child::before {
						position: absolute;
						left: 2.5rem;
					}
				}
			}

			/* Language tag banner */
			&:is(pre[data-language]) {
				padding-top: 3rem;
				border-radius: var(--radius-xl);
				border: 1px var(--tw-border-style) var(--color-border);

				&::before,
				&::after {
					text-transform: lowercase;
					font-size: var(--text-xs);
					position: absolute;
					padding: 0.6rem 1rem;
				}

				&::before {
					content: attr(data-language);
					inset: 0 0 auto 0;
					height: 2.5rem;
					background-color: var(--color-secondary);
					border-bottom: 1px var(--tw-border-style) var(--color-border);
				}

				&[data-detected="true"]::after {
					content: "(auto-detected)";
					inset: 0 0 auto auto;
					color: var(--color-muted-foreground);
				}
			}
		}
	}
</style>
