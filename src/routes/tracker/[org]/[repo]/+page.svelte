<script lang="ts">
	import { Transparent } from "svelte-exmarkdown";
	import { Separator } from "$lib/components/ui/separator";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import GHBadge from "$lib/components/GHBadge.svelte";

	let { data } = $props();

	type Item = NonNullable<typeof data.issues>[number] | NonNullable<typeof data.prs>[number];

	function isNew(date: Date) {
		return date.getTime() >= new Date().getTime() - 1000 * 60 * 60 * 24 * 30;
	}

	function daysAgo(date: Date) {
		const days = Math.floor((new Date().getTime() - date.getTime()) / 1000 / 60 / 60 / 24);
		return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-days, "day");
	}
</script>

<!-- snippets don't support generics: https://github.com/sveltejs/svelte/issues/15883 -->
<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
{#snippet list(title: string, items: Item[], itemToLink: (item: any) => string)}
	<!-- {#snippet list<T extends Item>(title: string, items: T[], itemToLink: (item: T) => string)} -->
	<div>
		<h2 class="mt-12 mb-2 text-3xl font-semibold tracking-tight">{title}</h2>
		{#each items as item, i (item.id)}
			{#if i > 0}
				<Separator class="my-1" />
			{/if}
			{@render listItem(item, itemToLink(item))}
		{/each}
	</div>
{/snippet}

{#snippet listItem(item: Item, link: string)}
	{@const date = new Date(item.created_at)}
	<a
		href={link}
		class="flex items-center gap-6 rounded-xl px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
	>
		<GHBadge
			mode="minimal"
			type={"base" in item || "pull_request" in item ? "pull" : "issue"}
			status={item.state === "closed"
				? "merged" in item
					? item.merged
						? "merged"
						: "closed"
					: "state_reason" in item && item.state_reason === "completed"
						? "solved"
						: "closed"
				: item.draft
					? "draft"
					: "open"}
			class="shrink-0"
		/>
		<div class="flex w-full flex-col">
			<div class="flex justify-between">
				<span>
					<MarkdownRenderer markdown={item.title} inline class="text-foreground" />
					<span class="text-muted-foreground">#{item.number}</span>
				</span>
				<span>
					{#if isNew(date)}
						{daysAgo(date)} •
					{/if}
					{new Intl.DateTimeFormat("en", {
						dateStyle: "medium"
					}).format(date)}
				</span>
			</div>
			<MarkdownRenderer
				markdown={item.body || "_No description provided_"}
				inline
				parseRawHtml
				class="line-clamp-2 max-w-full text-base text-muted-foreground"
				additionalPlugins={[
					{
						renderer: {
							h1: "h4",
							h2: "h4",
							h3: "h2",
							pre: Transparent,
							a: Transparent,
							ul: Transparent
						}
					}
				]}
			/>
		</div>
	</a>
{/snippet}

{#if data.prs}
	{@render list(
		"Pull requests",
		data.prs,
		pr => `/pull/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`
	)}
{/if}

{#if data.issues}
	{@render list("Issues", data.issues, issue => {
		const ownerSlashRepo = issue.html_url
			.replace("https://github.com/", "")
			.replace(/\/[A-z]+\/\d+$/, "");
		return `/issues/${ownerSlashRepo}/${issue.number}`;
	})}
{/if}
