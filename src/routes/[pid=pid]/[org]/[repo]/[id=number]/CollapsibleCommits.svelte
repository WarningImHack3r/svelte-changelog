<script lang="ts">
	import {
		GitCommitVertical,
		GitMerge,
		GitPullRequestClosed,
		GitPullRequestCreateArrow
	} from "@lucide/svelte";
	import type { PullRequestDetails } from "$lib/server/github-cache";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Badge } from "$lib/components/ui/badge";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Step from "$lib/components/Step.svelte";
	import Steps from "$lib/components/Steps.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import { dateTimeFormatter } from "./formatters";

	type Props = {
		prCreationDate: Date;
		prClosingDate: Date | null;
		merged?: boolean;
		commits?: PullRequestDetails["commits"];
		currentRepo: { owner: string; name: string };
	};

	let {
		prCreationDate,
		prClosingDate,
		merged = false,
		commits = [],
		currentRepo
	}: Props = $props();

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
				`([#$1](https://github.com/${currentRepo.owner}/${currentRepo.name}/issues/$1))`
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
</script>

<BottomCollapsible
	icon={GitCommitVertical}
	label="Commits"
	secondaryLabel="{commits.length} commit{commits.length > 1 ? 's' : ''}"
>
	<Steps class="my-4">
		<Step icon={GitPullRequestCreateArrow} class="text-base [&>span>svg]:text-green-500">
			<div class="flex flex-col">
				<span>Pull request open</span>
				<span class="text-muted-foreground">
					{dateTimeFormatter.format(prCreationDate)}
				</span>
			</div>
		</Step>
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
										• {dateTimeFormatter.format(new Date(commit.commit.author.date))}
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
		{#if prClosingDate}
			<Step
				icon={merged ? GitMerge : GitPullRequestClosed}
				class={["text-base", merged ? "[&>span>svg]:text-purple-400" : "[&>span>svg]:text-red-400"]}
			>
				<!-- hide the bottom tip of the steps line -->
				<div class="absolute bottom-0 -left-8 h-4 outline outline-background"></div>
				<div class="flex flex-col">
					<span>Pull request {merged ? "merged" : "closed"}</span>
					<span class="text-muted-foreground">
						{dateTimeFormatter.format(prClosingDate)}
					</span>
				</div>
			</Step>
		{/if}
	</Steps>
</BottomCollapsible>
