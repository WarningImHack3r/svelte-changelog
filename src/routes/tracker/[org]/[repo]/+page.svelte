<script lang="ts">
	import { page } from "$app/state";
	import { Image } from "@lucide/svelte";
	import { Transparent } from "svelte-exmarkdown";
	import { Separator } from "$lib/components/ui/separator";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";

	let { data } = $props();

	type Item =
		| NonNullable<typeof data.issues>[number]
		| NonNullable<typeof data.prs>[number]
		| NonNullable<typeof data.discussions>[number];

	/**
	 * Checks whether a date is more recent than a month.
	 *
	 * @param date the date to check
	 * @returns if it is more recent than a month
	 */
	function isNew(date: Date) {
		return date.getTime() >= new Date().getTime() - 1000 * 60 * 60 * 24 * 30;
	}

	/**
	 * Formats a date into "N days ago" format.
	 *
	 * @param date the input date
	 * @returns the formatted string output
	 */
	function daysAgo(date: Date) {
		const days = Math.floor((new Date().getTime() - date.getTime()) / 1000 / 60 / 60 / 24);
		return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-days, "day");
	}

	/**
	 * Checks if 2 dates are the same day.
	 *
	 * @param a the first date to compare
	 * @param b the second date to compare
	 * @returns if both dates are the same day
	 */
	function areSameDay(a: Date, b: Date) {
		return (
			a.getDate() === b.getDate() &&
			a.getMonth() === b.getMonth() &&
			a.getFullYear() === b.getFullYear()
		);
	}
</script>

<!-- generic snippets are now in Svelte but not yet in the language tools -->
<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
{#snippet list(title: string, items: Item[], itemToLink: (item: any) => string)}
	<!--{#snippet list<T extends Item>(title: string, items: T[], itemToLink: (item: T) => string)}-->
	<div>
		<h2 class="mt-12 mb-4 text-3xl font-semibold tracking-tight">{title}</h2>
		{#each items as item, i (item.id)}
			{#if i > 0}
				<Separator class="my-1" />
			{/if}
			{@render listItem(item, itemToLink(item))}
		{/each}
	</div>
{/snippet}

{#snippet listItem(item: Item, link: string)}
	{@const lastUpdate = new Date(item.updated_at)}
	{@const isUpdated = !areSameDay(lastUpdate, new Date(item.created_at))}
	<a
		href={link}
		class="flex items-center gap-6 rounded-xl px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
	>
		<GHBadge
			mode="minimal"
			type={"base" in item || "pull_request" in item
				? "pull"
				: "category" in item
					? "discussion"
					: "issue"}
			status={item.state === "closed"
				? "merged" in item
					? item.merged
						? "merged"
						: "closed"
					: "state_reason" in item && item.state_reason === "completed"
						? "solved"
						: "closed"
				: "draft" in item && item.draft
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
					{#if isNew(lastUpdate)}
						{daysAgo(lastUpdate)} •
					{/if}
					<span class={{ italic: isUpdated }}>
						{new Intl.DateTimeFormat("en", {
							dateStyle: "medium"
						}).format(lastUpdate)}
					</span>
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
							h4: "strong",
							sup: Transparent,
							blockquote: Transparent,
							p: Transparent,
							pre: Transparent,
							a: Transparent,
							ul: Transparent,
							ol: Transparent,
							li: Transparent
						}
					}
				]}
			>
				{#snippet img({ alt })}
					<div>
						<Image class="h-lh inline-block" />
						{alt}
					</div>
				{/snippet}
			</MarkdownRenderer>
		</div>
	</a>
{/snippet}

<div class="my-8">
	<h1 class="text-3xl font-semibold text-shadow-sm md:text-5xl">
		<a
			href="https://github.com/{page.params.org}/{page.params.repo}"
			target="_blank"
			class="group *:underline-offset-4 after:ml-0.5 after:inline-block after:-translate-x-2 after:font-sans after:text-2xl after:opacity-0 after:transition after:content-['↗'] hover:after:translate-x-0 hover:after:opacity-100"
		>
			<span class="text-primary group-hover:underline">{page.params.org}</span><span
				class="text-foreground no-underline">/</span
			><wbr /><span class="text-primary group-hover:underline">{page.params.repo}</span>
		</a>
	</h1>
	<h3 class="text-xl text-muted-foreground font-display text-shadow-sm/5">Repository tracker</h3>
</div>

{#if data.prs.length}
	{@render list(
		"Pull requests",
		data.prs,
		pr => `/pull/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`
	)}
{/if}

{#if data.discussions.length}
	{@render list("Discussions", data.discussions, d => {
		const ownerSlashRepo = d.repository_url.replace("https://api.github.com/repos/", "");
		return `/discussions/${ownerSlashRepo}/${d.number}`;
	})}
{/if}

{#if data.issues.length}
	{@render list("Issues", data.issues, issue => {
		const ownerSlashRepo = issue.html_url
			.replace("https://github.com/", "")
			.replace(/\/[A-z]+\/\d+$/, "");
		return `/issues/${ownerSlashRepo}/${issue.number}`;
	})}
{/if}
