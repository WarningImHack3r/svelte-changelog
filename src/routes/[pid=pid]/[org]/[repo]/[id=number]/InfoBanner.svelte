<script lang="ts" module>
	import type { GitHubAPI } from "$lib/server/github-api";

	const percentFormatter = new Intl.NumberFormat("en-US", {
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
	<div class="flex justify-between overflow-x-auto gap-8 rounded-md py-2 px-3 scroll-mask-x">
		<div class="flex text-nowrap items-center gap-4">
			<!-- Milestones (PRs & issues) -->
			{#if "milestone" in info && info.milestone}
				<a
					href={info.milestone.html_url}
					rel="external"
					target="_blank"
					class="flex py-2 px-3 group rounded-md hover:bg-accent flex-col group"
				>
					<div class="flex items-center gap-2">
						<Milestone />
						<span class="font-semibold group-hover:underline underline-offset-2">
							{info.milestone.title}
						</span>
						<ArrowUpRight
							class="size-4 -ms-1 transition-[translate,opacity] select-none -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
						/>
					</div>
					{#if info.milestone.description}
						<span class="text-muted-foreground text-sm">{info.milestone.description}</span>
					{/if}
					<div class="flex items-center gap-2">
						{const progress = info.milestone.closed_issues}
						{const total = info.milestone.open_issues + info.milestone.closed_issues}
						<Progress value={progress} max={total} class="w-full min-w-20" />
						{percentFormatter.format(progress / total)}
					</div>
				</a>
			{/if}
			<!-- Branches (PRs) -->
			{#if "base" in info}
				<div class="flex gap-2 items-center">
					<Button
						variant="link"
						href="{info.base.repo.html_url}/tree/{info.base.ref}"
						rel="external"
						target="_blank"
						class="text-foreground p-0 h-auto text-base"
					>
						{info.base.ref}
					</Button>
					&lt;-
					<Button
						variant="link"
						href="{info.head.repo.html_url}/tree/{info.head.ref}"
						rel="external"
						target="_blank"
						class="text-foreground p-0 h-auto text-base"
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
					class="border-current text-(--color) text-base selection:text-white selection:bg-(--color) py-1 px-3 bg-current/20"
					title={info.type.description || undefined}
				>
					{info.type.name}
				</Badge>
			{/if}
			<!-- Category (discussions) -->
			{#if "category" in info}
				<Badge
					variant="outline"
					class="text-base py-1 px-3 gap-2"
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
			<div class="flex gap-2 items-center">
				{#each info.labels as label (label)}
					{#if typeof label === "string"}
						<Badge variant="outline">{label}</Badge>
					{:else if label.name}
						<Badge
							variant="outline"
							style={label.color ? `--color: #${label.color}` : undefined}
							class="border-(--color) dark:text-(--color) selection:text-foreground selection:bg-background dark:selection:text-black dark:selection:bg-(--color) bg-(--color) dark:bg-(--color)/20"
							title={label.description || undefined}
						>
							{label.name}
						</Badge>
					{/if}
				{/each}
			</div>
		</div>
		<span class="sm:hidden text-muted-foreground text-nowrap">
			{@render badgeText(info)}
		</span>
		{#if "assignees" in info && info.assignees?.length}
			<div class="flex gap-1 items-center">
				<UserRoundArrowLeft class="size-5 text-muted-foreground shrink-0" />
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
