<script lang="ts">
	import { resolve } from "$app/paths";
	import { Image, Info, LoaderCircle, TriangleAlert } from "@lucide/svelte";
	import remarkGitHub from "remark-github";
	import { Transparent } from "svelte-exmarkdown";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Separator } from "$lib/components/ui/separator";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { animatedClasses } from "$lib/components/AnimatedButton.svelte";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";

	let { data, params } = $props();

	type Item =
		| Awaited<NonNullable<typeof data.issues>>[number]
		| Awaited<NonNullable<typeof data.prs>>[number]
		| Awaited<NonNullable<typeof data.discussions>>[number];

	const daysAgoFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const shortDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

	/**
	 * Checks whether a date is more recent than a month.
	 *
	 * @param date the date to check
	 * @returns if it is more recent than a month
	 */
	function isNew(date: Date) {
		return date.getTime() >= Date.now() - 1000 * 60 * 60 * 24 * 30;
	}

	/**
	 * Formats a date into "N days ago" format.
	 *
	 * @param date the input date
	 * @returns the formatted string output
	 */
	function daysAgo(date: Date) {
		const days = Math.floor((Date.now() - date.getTime()) / 1000 / 60 / 60 / 24);
		return daysAgoFormatter.format(-days, "day");
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

{#snippet list<T extends Item>(
	title: string,
	items: T[] | Promise<T[]>,
	itemToLink: (item: T) => string
)}
	<div>
		<h2 class="mt-12 mb-4 text-3xl font-semibold tracking-tight">{title}</h2>
		{#await items}
			<p class="mt-2 mb-4 inline-flex justify-center text-xl">
				<LoaderCircle class="mr-2 h-lh shrink-0 animate-spin" />
				Loading (this may take a while)...
			</p>
		{:then loadedItems}
			{#each loadedItems as item, i (item.id)}
				{#if i > 0}
					<Separator class="my-1" />
				{/if}
				{@render listItem(item, itemToLink(item))}
			{:else}
				<p class="text-lg">Nothing to show there :/</p>
			{/each}
		{:catch e}
			<p class="text-lg text-destructive">Failed to load elements: {e}</p>
		{/await}
	</div>
{/snippet}

<!-- prettier-ignore -->
{#snippet listItem(item: Item, link: string)}
	{@const lastUpdate = new Date(item.updated_at)}
	{@const createdAt = new Date(item.created_at)}
	{@const isUpdated = !areSameDay(lastUpdate, createdAt)}

	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={link} class="flex items-center gap-6 rounded-md px-4 py-3 transition-colors hover:bg-muted">
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
			<div class="flex justify-between gap-4">
				<span>
    				{#if item.html_url.includes("/pull/") && (item.body?.toLowerCase()?.includes("breaking change") || item.title.startsWith("breaking:"))}
                        <Tooltip.Provider delayDuration={300}>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <TriangleAlert class="inline-block me-0.5 text-amber-500" />
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                    class="border bg-popover text-popover-foreground"
									arrowClasses="bg-popover border-b border-r"
                                >
                                    This pull request might introduce a breaking change!
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
    				{/if}
					<MarkdownRenderer markdown={item.title} inline class="text-foreground" />
					<span class="text-muted-foreground">#{item.number}</span>
				</span>
				<span class="text-right text-nowrap">
					{#if isUpdated && isNew(lastUpdate)}
						<span class="italic font-semibold">updated {daysAgo(lastUpdate)}</span> •
					{/if}
					<span>{shortDateFormatter.format(createdAt)}</span>
				</span>
			</div>
			<MarkdownRenderer
				markdown={item.body || "_No description provided_"}
				inline
				parseRawHtml
				class="line-clamp-2 max-w-full text-base wrap-anywhere text-muted-foreground"
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
					},
					{
						remarkPlugin: [remarkGitHub, { repository: `${params.org}/${params.repo}` }]
					}
				]}
			>
				{#snippet img({ alt })}
					<div>
						<Image class="inline-block h-[.9lh]" />
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
			href="https://github.com/{params.org}/{params.repo}"
			target="_blank"
			class="group *:underline-offset-4 after:ml-0.5 after:inline-block after:-translate-x-2 after:font-sans after:text-2xl after:opacity-0 after:transition after:content-['↗'] hover:after:translate-x-0 hover:after:opacity-100"
		>
			<span class="text-primary group-hover:underline">{params.org}</span><span
				class="text-foreground no-underline">/</span
			><wbr /><span class="text-primary group-hover:underline">{params.repo}</span>
		</a>
	</h1>
	<div class="flex items-center gap-2">
		<h3 class="font-display text-xl text-muted-foreground text-shadow-sm/5">Repository tracker</h3>
		<Dialog.Root>
			<Dialog.Trigger
				class={[
					buttonVariants({ variant: "ghost", size: "sm", class: animatedClasses }),
					"h-4! rounded-full! px-0! pt-0.5"
				]}
			>
				<Info />
			</Dialog.Trigger>
			<Dialog.Content class="[&>p]:mt-3">
				<h4 class="text-lg font-semibold">How it works</h4>
				<p>The content comes, as everything else in this site, from GitHub.</p>
				<p>
					All content, be it issues, discussions, or PRs, is filtered to only get displayed if
					authored by the org's members since last year.
				</p>
				<p>
					For PRs, an additional filtering is performed to <em>not</em> pick any PR that fixes any issue.
				</p>
				<p>Then, all of this is sorted by update date, and... that's it!</p>
				<p>
					This algorithm might be not fine-grained enough, but I find it working quite well for now.
					Open an issue/PR if you have any improvement suggestion!
				</p>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>

{@render list("Pull requests", data.prs, pr =>
	resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
		pid: "pull",
		org: pr.base.repo.owner.login,
		repo: pr.base.repo.name,
		id: `${pr.number}`
	})
)}

{@render list("Discussions", data.discussions, d => {
	const [org = "", repo = ""] = d.repository_url
		.replace("https://api.github.com/repos/", "")
		.split("/");
	return resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
		pid: "discussions",
		org,
		repo,
		id: `${d.number}`
	});
})}

{@render list("Issues", data.issues, issue => {
	const [org = "", repo = ""] = issue.html_url
		.replace("https://github.com/", "")
		.replace(/\/[A-z]+\/\d+$/, "")
		.split("/");
	return resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
		pid: "issues",
		org,
		repo,
		id: `${issue.number}`
	});
})}
