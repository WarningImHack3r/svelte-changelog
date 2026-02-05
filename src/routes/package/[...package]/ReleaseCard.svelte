<script lang="ts" module>
	import { VERSION as KIT_VERSION } from "@sveltejs/kit";
	import { VERSION } from "svelte/compiler";

	const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "full",
		timeStyle: "short"
	});

	const versionedPackages: Record<string, string> = {
		svelte: VERSION,
		"@sveltejs/kit": KIT_VERSION
	};
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { dev } from "$app/environment";
	import { page } from "$app/state";
	import { ArrowUpRight } from "@lucide/svelte";
	import { confetti } from "@neoconfetti/svelte";
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import semver from "semver";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Badge } from "$lib/components/ui/badge";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import ListElementRenderer from "$lib/components/renderers/ListElementRenderer.svelte";

	type Props = {
		index?: number;
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
		repo,
		release,
		isLatest: isLatestRelease = false,
		isMaintenance: isMaintenanceRelease = false
	}: Props = $props();

	let semVersion = $derived(semver.coerce(release.cleanVersion));
	let releaseDate = $derived(new Date(release.published_at ?? release.created_at));
	let releaseBody = $derived.by(() => {
		if (!release.body) return "_No release body_";
		// Add missing links to PRs in the release body
		return repo.owner && repo.name
			? release.body.replace(
					// Match all `(#1234)` patterns, including `#issuecomment-` ones and multiple in one parenthesis
					/(?<!\]\([^)]*)\b#(\d+)(#issuecomment-\d+)?(?![^[]*\])/g,
					(match, prNumber, comment) => {
						const commentPart = comment ?? "";
						const prUrl = `https://github.com/${repo.owner}/${repo.name}/pull/${prNumber}${commentPart}`;
						return `[${match}](${prUrl})`;
					}
				)
			: release.body;
	});
	let isMajorRelease = $derived(
		!release.prerelease &&
			semVersion?.minor === 0 &&
			semVersion?.patch === 0 &&
			!semVersion?.prerelease.length
	);
	let isOlderThanAWeek = $derived(releaseDate.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7);

	$effect(() => {
		const unsubscribe = setDynamicInterval(
			() => (releaseDate = new Date(releaseDate)),
			() => getRefreshPeriod(untrack(() => releaseDate))
		);

		return unsubscribe;
	});

	/**
	 * A version of {@link setInterval} that has a dynamic `delay`
	 * parameter, so it can dynamically adjust.
	 *
	 * @param callback the callback given to the {@link setInterval} (internally a {@link setTimeout})
	 * @param delayFn a function called everytime a new `callback` call is about to begin, specifying
	 * its firing delay
	 * @returns an unsubscribe function to stop everything
	 */
	function setDynamicInterval(
		callback: Parameters<typeof setTimeout>[0],
		delayFn: () => NonNullable<Parameters<typeof setTimeout>[1]>
	) {
		let timeoutId: ReturnType<typeof setInterval> | null = null;
		let stopped = false;

		function schedule() {
			if (stopped) return;

			const delay = delayFn();

			timeoutId = setTimeout(
				() => {
					callback();
					schedule();
				},
				Math.min(delay, 2 ** 31 - 1) // max setTimeout value before it overflows
			);
		}

		schedule();

		return function clear() {
			stopped = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		};
	}

	/**
	 * A small utility function to get the diff between two dates
	 * @param first The initial date
	 * @param second The date to compare the first one to
	 * @returns A diff object with every unit from second to year
	 */
	function getDiffBetween(first: Date, second: Date) {
		return {
			get milliseconds() {
				return second.getTime() - first.getTime();
			},
			get seconds() {
				return Math.floor(this.milliseconds / 1000);
			},
			get minutes() {
				return Math.floor(this.seconds / 60);
			},
			get hours() {
				return Math.floor(this.minutes / 60);
			},
			get days() {
				return Math.floor(this.hours / 24);
			},
			get months() {
				return Math.floor(this.days / 30);
			},
			get years() {
				return Math.floor(this.months / 12);
			}
		};
	}

	/**
	 * Get the refresh period needed for a "live feel"
	 * when displaying a date. Mainly meant to be used inside
	 * a {@link setInterval}.
	 *
	 * @param date The date to get the period for
	 * @returns The number of milliseconds to wait for before refreshing
	 */
	function getRefreshPeriod(date: Date) {
		const { milliseconds, minutes, hours, days, months, years } = getDiffBetween(date, new Date());

		function diff(value: number) {
			return value - (milliseconds % value);
		}

		if (years > 0) {
			return diff(12 * 30 * 24 * 60 * 60 * 1_000);
		} else if (months > 0) {
			return diff(30 * 24 * 60 * 60 * 1_000);
		} else if (days > 0) {
			return diff(24 * 60 * 60 * 1_000);
		} else if (hours > 0) {
			return diff(60 * 60 * 1_000);
		} else if (minutes > 0) {
			return diff(60 * 1_000);
		}
		return diff(1_000);
	}

	/**
	 * Converts a date to a relative date string.
	 * e.g., "2 days ago", "3 hours ago", "1 minute ago"
	 *
	 * @param locale the locale to use for formatting
	 * @returns a function you input the date to convert in, returning the relative date
	 */
	function timeAgo(locale = "en-US") {
		const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

		return (date: Date) => {
			const { seconds, minutes, hours, days, months, years } = getDiffBetween(date, new Date());

			if (years > 0) {
				return formatter.format(-years, "year");
			} else if (months > 0) {
				return formatter.format(-months, "month");
			} else if (days > 0) {
				return formatter.format(-days, "day");
			} else if (hours > 0) {
				return formatter.format(-hours, "hour");
			} else if (minutes > 0) {
				return formatter.format(-minutes, "minute");
			}
			return formatter.format(-Math.floor(seconds), "second");
		};
	}

	const ago = timeAgo();
</script>

{#snippet badges()}
	<Tooltip.Provider delayDuration={300}>
		{#if isLatestRelease}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Badge class="bg-green-600 hover:bg-green-600 dark:bg-green-700 hover:dark:bg-green-700">
						Latest
					</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content
					class="border bg-popover text-sm text-popover-foreground"
					arrowClasses="bg-popover border-b border-r"
				>
					This is the latest stable release of this package
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
		{#if isMajorRelease}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Badge>Major</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content
					class="border bg-popover text-sm text-popover-foreground"
					arrowClasses="bg-popover border-b border-r"
				>
					Major update (e.g.: 1.0.0, 2.0.0, 3.0.0...)
				</Tooltip.Content>
			</Tooltip.Root>
		{:else if release.prerelease}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Badge variant="outline" class="border-primary text-primary">Prerelease</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content
					class="border bg-popover text-sm text-popover-foreground"
					arrowClasses="bg-popover border-b border-r"
				>
					This version is an alpha or a beta, unstable version
				</Tooltip.Content>
			</Tooltip.Root>
		{:else if isMaintenanceRelease}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Badge
						variant="outline"
						class="border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
					>
						Maintenance
					</Badge>
				</Tooltip.Trigger>
				<Tooltip.Content
					class="border bg-popover text-sm text-popover-foreground"
					arrowClasses="bg-popover border-b border-r"
				>
					An update bringing bug fixes and minor improvements to an older major version
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	</Tooltip.Provider>
{/snippet}

<Accordion.Item
	id={release.cleanVersion}
	value={`${release.id}`}
	class={[
		"scroll-mt-20 rounded-md border-b-0 bg-background shadow-lg outline outline-transparent transition-colors duration-300 *:data-accordion-content:rounded-b-md *:data-accordion-content:bg-accent/30 data-[state=open]:outline-muted-foreground/20",
		{ "border border-primary": isMajorRelease && index < 3 },
		{ "ring ring-primary": page.url.hash && page.url.hash === `#${release.cleanVersion}` },
		{
			"relative mb-2.5 ring-4 ring-primary before:absolute before:-top-6 before:-left-1 before:-z-10 before:rounded-t-lg before:bg-primary before:px-2 before:pb-1.5 before:font-display before:text-white before:content-['Current_version'] before:text-shadow-xs/50 before:text-shadow-black":
				dev && versionedPackages[release.cleanName] === release.cleanVersion
		},
		{ "mt-8": dev && versionedPackages[release.cleanName] == release.cleanVersion && index > 0 }
	]}
>
	<Accordion.Trigger
		class="group bg-secondary px-4 py-3 hover:bg-secondary/75 hover:no-underline data-[state=open]:rounded-b-none [&>svg]:my-auto [&>svg]:w-4"
	>
		<div class="flex w-full items-center gap-2 xs:gap-1">
			<div class="flex flex-col items-start gap-1">
				{#if isMajorRelease}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger class="w-min text-left sm:w-auto">
								<span
									style:--major-gradient="135deg,#ffcc80,#ff9933,#e67300,#cc7a00,#b36b00,#4d2e00,black"
									style:--dark-major-gradient="135deg,#ffcc80,#ff9933,#e67300,#ff9933,#ffcc80,#fff5e6,white"
									style:background-size="200% 200%"
									class="animate-major-gradient bg-linear-(--major-gradient) bg-clip-text text-left font-display text-xl text-transparent dark:bg-linear-(--dark-major-gradient)"
								>
									{release.cleanName}@{release.cleanVersion}
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
							<Tooltip.Content
								class="border bg-popover text-sm text-popover-foreground"
								arrowClasses="bg-popover border-b border-r"
							>
								{release.cleanName}
								{semVersion?.major} is available!
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{:else}
					<span class="w-min text-left font-display text-lg group-hover:underline sm:w-auto">
						{release.cleanName}@{release.cleanVersion}
					</span>
				{/if}
				<div class="flex items-center gap-2 xs:hidden">
					{@render badges()}
				</div>
			</div>
			<span class="ml-auto flex text-right text-sm text-muted-foreground xs:mr-2 xs:ml-0">
				<span class="mr-1 hidden xs:block">•</span>
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger class="text-right">
							{isOlderThanAWeek
								? releaseDate.toLocaleDateString("en-US", {
										year:
											(releaseDate.getMonth() === 0 && releaseDate.getDate() <= 15) ||
											releaseDate.getFullYear() < new Date().getFullYear()
												? "numeric"
												: undefined,
										month: "long",
										day: "numeric"
									})
								: ago(releaseDate)}
						</Tooltip.Trigger>
						<Tooltip.Content
							class="border bg-popover text-sm text-popover-foreground"
							arrowClasses="bg-popover border-b border-r"
						>
							{isOlderThanAWeek ? ago(releaseDate) : fullDateFormatter.format(releaseDate)}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</span>
			<div class="hidden items-center gap-2 xs:flex">
				{@render badges()}
			</div>
		</div>
	</Accordion.Trigger>
	<Accordion.Content class="px-6">
		<div class="relative mt-4 flex flex-col gap-2">
			<MarkdownRenderer
				markdown={releaseBody}
				additionalPlugins={[
					{
						remarkPlugin:
							repo.owner && repo.name
								? [remarkGitHub, { repository: `${repo.owner}/${repo.name}` }]
								: undefined
					},
					{ remarkPlugin: remarkGemoji },
					{ renderer: { li: ListElementRenderer } }
				]}
				class="prose-sm max-w-full prose-p:my-0"
			/>
			<div class="flex items-end-safe justify-between gap-8">
				<!-- Reactions -->
				<Reactions reactions={release.reactions} reactionItemUrl={release.html_url} />
				<!-- Open the release on GitHub in a new tab -->
				<AnimatedButton variant="outline" size="sm" class="invisible w-16 sm:w-36" />
				<AnimatedButton
					href={release.html_url}
					variant="outline"
					size="sm"
					target="_blank"
					class="group absolute right-0 bottom-0 shrink-0 gap-0 transition-colors duration-500"
				>
					<span class="-mr-6 hidden sm:group-hover:block">Open on GitHub</span>
					<img
						src="/github.svg"
						alt="GitHub"
						class="size-5 transition-opacity duration-300 sm:group-hover:opacity-0 dark:invert"
					/>
					<ArrowUpRight
						class="ml-2 size-4 transition-transform duration-300 sm:group-hover:translate-x-1 sm:group-hover:-translate-y-1"
					/>
				</AnimatedButton>
			</div>
		</div>
	</Accordion.Content>
</Accordion.Item>
