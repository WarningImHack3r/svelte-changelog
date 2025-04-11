<script lang="ts">
	import { ArrowUpRight } from "@lucide/svelte";
	import { confetti } from "@neoconfetti/svelte";
	import semver from "semver";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import ListElementRenderer from "$lib/components/renderers/ListElementRenderer.svelte";

	type Props = {
		index?: number;
		packageName: string;
		repo: {
			owner: string;
			name: string;
		};
		release: { cleanName: string; cleanVersion: string } & GitHubRelease;
		isLatest?: boolean;
		isMaintenance?: boolean;
	};
	let {
		index = 0,
		packageName,
		repo,
		release,
		isLatest: isLatestRelease = false,
		isMaintenance: isMaintenanceRelease = false
	}: Props = $props();

	let releaseVersion = $derived(release.cleanVersion);
	let semVersion = $derived(semver.coerce(releaseVersion));
	let releaseDate = $derived(new Date(release.published_at ?? release.created_at));
	let releaseBody = $derived.by(() => {
		if (!release.body) return "_No release body_";
		// Add missing links to PRs in the release body
		return release.body.replace(
			/[^[][#\d, ]*?#(\d+)(#issuecomment-\d+)?[#\d, ]*?[^\]]/g,
			// Match all `(#1234)` patterns, including `#issuecomment-` ones and multiple in one parenthesis
			(match, prNumber, rest) => {
				if (!rest) rest = "";
				const prUrl = `https://github.com/${repo.owner}/${repo.name}/pull/${prNumber}${rest}`;
				// replaceception
				return match.replace(`#${prNumber}${rest}`, `[#${prNumber}${rest}](${prUrl})`);
			}
		);
	});
	let isMajorRelease = $derived(
		!release.prerelease &&
			semVersion?.minor === 0 &&
			semVersion?.patch === 0 &&
			!semVersion?.prerelease.length
	);
	let isOlderThanAWeek = $derived(
		releaseDate.getTime() < new Date().getTime() - 1000 * 60 * 60 * 24 * 7
	);

	/**
	 * Converts a date to a relative date string.
	 * e.g., "2 days ago", "3 hours ago", "1 minute ago"
	 *
	 * @param date The date to convert
	 * @param locale the locale to use for formatting
	 * @returns the relative date
	 */
	function timeAgo(date: Date, locale = "en") {
		const diff = (new Date().getTime() - date.getTime()) / 1000;
		const minutes = Math.floor(diff / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const months = Math.floor(days / 30);
		const years = Math.floor(months / 12);
		const formatter = new Intl.RelativeTimeFormat(locale);

		if (years > 0) {
			return formatter.format(0 - years, "year");
		} else if (months > 0) {
			return formatter.format(0 - months, "month");
		} else if (days > 0) {
			return formatter.format(0 - days, "day");
		} else if (hours > 0) {
			return formatter.format(0 - hours, "hour");
		} else if (minutes > 0) {
			return formatter.format(0 - minutes, "minute");
		}
		return formatter.format(0 - diff, "second");
	}
</script>

{#snippet badges()}
	{#if isLatestRelease}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={300}>
				<Tooltip.Trigger>
					<Badge class="bg-green-600 hover:bg-green-600 dark:bg-green-700 hover:dark:bg-green-700">
						Latest
					</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content>This is the latest stable release of this package</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/if}
	{#if isMajorRelease}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={300}>
				<Tooltip.Trigger>
					<Badge>Major</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content>Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{:else if release.prerelease}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={300}>
				<Tooltip.Trigger>
					<Badge variant="outline" class="border-primary text-primary">Prerelease</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content>This version is an alpha or a beta, unstable version</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{:else if isMaintenanceRelease}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={300}>
				<Tooltip.Trigger>
					<Badge variant="outline" class="border-blue-600 text-blue-600">Maintenance</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content>
					An update bringing bug fixes and minor improvements to an older major version
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/if}
{/snippet}

<Accordion.Item
	value={release.id.toString()}
	class={[
		"rounded-xl border-b-0 shadow-lg outline outline-transparent transition-colors duration-300 data-[state=open]:outline-muted-foreground/20",
		{ "rounded-xl border border-primary": isMajorRelease && index < 3 }
	]}
>
	<Accordion.Trigger
		class="group rounded-t-xl bg-secondary px-4 py-3 hover:bg-secondary/75 hover:no-underline data-[state=closed]:rounded-b-xl"
	>
		<div class="flex w-full items-center gap-2 xs:items-baseline xs:gap-1">
			<div class="flex flex-col items-start gap-1">
				{#if isMajorRelease}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								<span
									style="--major-gradient: 135deg, #ffcc80, #ff9933, #e67300, #ff9933, #ffcc80, #fff5e6, white; background-size: 200% 200%"
									class="animate-major-gradient bg-linear-(--major-gradient) bg-clip-text text-left font-display text-xl text-transparent"
								>
									{packageName}@{releaseVersion}
								</span>
								{#if index === 0}
									<div
										class="ml-auto"
										use:confetti={{
											duration: 5000,
											colors: ["orange", "white"]
										}}
									></div>
								{/if}
							</Tooltip.Trigger>
							<Tooltip.Content>
								{packageName}
								{semVersion?.major} is available!
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{:else}
					<span class="font-display text-lg group-hover:underline">
						{packageName}@{releaseVersion}
					</span>
				{/if}
				<div class="mb-auto flex items-center gap-2 xs:hidden">
					{@render badges()}
				</div>
			</div>
			<span class="mr-4 ml-auto flex text-right text-sm text-muted-foreground xs:mr-2 xs:ml-0">
				<span class="mr-1 hidden xs:block">•</span>
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{isOlderThanAWeek
								? releaseDate.toLocaleDateString("en", {
										year:
											releaseDate.getMonth() === 0 && releaseDate.getDate() <= 15
												? "numeric"
												: undefined,
										month: "long",
										day: "numeric"
									})
								: timeAgo(releaseDate)}
						</Tooltip.Trigger>
						<Tooltip.Content>
							{isOlderThanAWeek
								? timeAgo(releaseDate)
								: new Intl.DateTimeFormat("en", {
										dateStyle: "long",
										timeStyle: "short"
									}).format(releaseDate)}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</span>
			<div class="mb-auto hidden items-center gap-2 xs:flex">
				{@render badges()}
			</div>
		</div>
	</Accordion.Trigger>
	<Accordion.Content class="rounded-b-xl bg-accent/30 px-6">
		<div class="relative mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
			<MarkdownRenderer
				markdown={releaseBody}
				additionalPlugins={[{ renderer: { li: ListElementRenderer } }]}
				class="prose-sm max-w-full prose-p:my-0"
			/>
			<!-- Open the release on GitHub in a new tab -->
			<Button variant="outline" size="sm" class="invisible mr-6">this is a long long text</Button>
			<Button
				href={release.html_url}
				variant="outline"
				size="sm"
				target="_blank"
				class="group absolute right-0 bottom-1 shrink-0 gap-0 transition-colors duration-500"
			>
				<span class="-mr-6 hidden group-hover:block">Open on GitHub</span>
				<img
					src="/github.svg"
					alt="GitHub"
					class="size-5 transition-opacity duration-300 group-hover:opacity-0 dark:invert"
				/>
				<ArrowUpRight
					class="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
				/>
			</Button>
		</div>
	</Accordion.Content>
</Accordion.Item>
