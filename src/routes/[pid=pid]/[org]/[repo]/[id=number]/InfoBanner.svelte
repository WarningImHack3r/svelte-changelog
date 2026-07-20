<script lang="ts" module>
	import { siteLang } from "$lib/properties";
	import type { GitHubAPI } from "$lib/server/github-api";

	const percentFormatter = new Intl.NumberFormat(siteLang, {
		style: "percent",
		maximumFractionDigits: 0
	});

	type Info = NonNullable<Awaited<ReturnType<GitHubAPI["getItemDetails"]>>>["info"];

	export { badgeText };
</script>

<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { ArrowUpRight, Milestone, UserRoundArrowLeft } from "@lucide/svelte";
	import remarkGemoji from "remark-gemoji";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Progress } from "$lib/components/ui/progress";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import { dateTimeFormatter } from "./formatters";

	type Props = {
		info: Info;
		class?: ClassValue;
	};

	let { info, class: className }: Props = $props();
</script>

{#snippet badgeText(obj: Info)}
	{#if "merged" in obj && obj.merged_at}
		Merged at {dateTimeFormatter.format(new Date(obj.merged_at))}
		{#if obj.merged_by}
			by {obj.merged_by.login}
		{/if}
	{:else if "closed_at" in obj && obj.closed_at}
		Closed at {dateTimeFormatter.format(new Date(obj.closed_at))}
	{:else}
		Opened at {dateTimeFormatter.format(new Date(obj.created_at))}
	{/if}
{/snippet}

<div class={["mt-4 rounded-md border bg-accent dark:bg-card", className]}>
	<div class="flex justify-between gap-8 overflow-x-auto rounded-md px-3 py-2 scroll-mask-x">
		<div class="flex items-center gap-4 text-nowrap">
			<!-- Milestones (PRs & issues) -->
			{#if "milestone" in info && info.milestone}
				<a
					href={info.milestone.html_url}
					rel="external"
					target="_blank"
					class="group group flex flex-col rounded-md px-3 py-2 hover:bg-accent"
				>
					<div class="flex items-center gap-2">
						<Milestone />
						<span class="font-semibold underline-offset-2 group-hover:underline">
							{info.milestone.title}
						</span>
						<ArrowUpRight
							class="-ms-1 size-4 -translate-x-2 opacity-0 transition-[translate,opacity] select-none group-hover:translate-x-0 group-hover:opacity-100"
						/>
					</div>
					{#if info.milestone.description}
						<span class="text-sm text-muted-foreground">{info.milestone.description}</span>
					{/if}
					<div class="flex items-center gap-2">
						{const progress = info.milestone.closed_issues}
						{const total = info.milestone.open_issues + info.milestone.closed_issues}
						<Progress value={progress} max={Math.max(total, 1)} class="w-full min-w-20" />
						{percentFormatter.format(total > 0 ? progress / total : 0)}
					</div>
				</a>
			{/if}
			<!-- Branches (PRs) -->
			{#if "base" in info}
				<div class="flex items-center gap-2">
					<Button
						variant="link"
						href="{info.base.repo.html_url}/tree/{info.base.ref}"
						rel="external"
						target="_blank"
						class="h-auto p-0 text-base text-foreground"
					>
						{info.base.ref}
					</Button>
					&lt;-
					<Button
						variant="link"
						href="{info.head.repo.html_url}/tree/{info.head.ref}"
						rel="external"
						target="_blank"
						class="h-auto p-0 text-base text-foreground"
					>
						{#if info.head.user.login === info.base.user.login}
							{info.head.ref}
						{:else}
							{info.head.label}
						{/if}
					</Button>
				</div>
			{/if}
			<!-- Type (issues) -->
			{#if "type" in info && info.type}
				<Badge
					variant="outline"
					style="--color: {info.type.color}"
					class="border-current bg-current/20 px-3 py-1 text-base text-(--color) selection:bg-(--color) selection:text-white"
					title={info.type.description || undefined}
				>
					{info.type.name}
				</Badge>
			{/if}
			<!-- Category (discussions) -->
			{#if "category" in info}
				<Badge
					variant="outline"
					class="gap-2 px-3 py-1 text-base"
					title={info.category.description}
				>
					<MarkdownRenderer
						markdown={info.category.emoji}
						inline
						additionalPlugins={[{ remarkPlugin: remarkGemoji }]}
					/>
					{info.category.name}
				</Badge>
			{/if}
			<!-- Labels (common) -->
			<div class="flex items-center gap-2">
				{#each info.labels as label (label)}
					{#if typeof label === "string"}
						<Badge variant="outline">{label}</Badge>
					{:else if label.name}
						<Badge
							variant="outline"
							style={label.color ? `--color: #${label.color}` : undefined}
							class="border-(--color) bg-(--color) selection:bg-background selection:text-foreground dark:bg-(--color)/20 dark:text-(--color) dark:selection:bg-(--color) dark:selection:text-black"
							title={label.description || undefined}
						>
							{label.name}
						</Badge>
					{/if}
				{/each}
			</div>
		</div>
		<span class="flex items-center text-nowrap text-muted-foreground md:hidden">
			{@render badgeText(info)}
		</span>
		{#if "assignees" in info && info.assignees?.length}
			<div class="flex items-center gap-1">
				<UserRoundArrowLeft class="size-5 shrink-0 text-muted-foreground" />
				<div class="text-nowrap">
					{#each info.assignees as assignee, i (assignee.login)}
						{#if i > 0}
							,
						{/if}
						<Button
							variant="link"
							href={assignee.html_url}
							rel="external"
							target="_blank"
							class="h-auto p-0 text-base text-foreground"
						>
							{assignee.login}
						</Button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
