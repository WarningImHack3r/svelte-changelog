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
	// eslint-disable-next-line svelte/no-unused-props
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
	 * @returns the relative date
	 */
	export function toRelativeDateString(date: Date) {
		let dateDiff = new Date().getTime() - date.getTime();
		let relevantUnit: Intl.RelativeTimeFormatUnit;
		switch (true) {
			case dateDiff < 1000 * 60:
				dateDiff /= 1000;
				relevantUnit = "seconds";
				break;
			case dateDiff < 1000 * 60 * 60:
				dateDiff /= 1000 * 60;
				relevantUnit = "minutes";
				break;
			case dateDiff < 1000 * 60 * 60 * 24:
				dateDiff /= 1000 * 60 * 60;
				relevantUnit = "hours";
				break;
			default:
				dateDiff /= 1000 * 60 * 60 * 24;
				relevantUnit = "days";
				break;
		}
		return new Intl.RelativeTimeFormat("en", {
			style: "long"
		}).format(-Math.ceil(dateDiff), relevantUnit);
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

<Accordion.Item value={release.id.toString()}>
	<Accordion.Trigger class="group hover:no-underline">
		<div class="flex w-full items-center gap-2 xs:items-baseline xs:gap-1">
			<div class="flex flex-col items-start gap-1">
				{#if isMajorRelease}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								{#if index === 0}
									<div
										class="mx-auto"
										use:confetti={{
											duration: 5000,
											colors: ["orange", "white"]
										}}
									></div>
								{/if}
								<span class="majorGradient text-left text-xl">
									{packageName}@{releaseVersion}
								</span>
							</Tooltip.Trigger>
							<Tooltip.Content>
								{packageName}
								{semVersion?.major} is available!
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{:else}
					<span class="text-lg group-hover:underline">{packageName}@{releaseVersion}</span>
				{/if}
				<div class="flex items-center gap-2 xs:hidden">
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
								: toRelativeDateString(releaseDate)}
						</Tooltip.Trigger>
						<Tooltip.Content>
							{isOlderThanAWeek
								? toRelativeDateString(releaseDate)
								: new Intl.DateTimeFormat("en", {
										dateStyle: "long",
										timeStyle: "short"
									}).format(releaseDate)}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</span>
			<div class="hidden items-center gap-2 xs:flex">
				{@render badges()}
			</div>
		</div>
	</Accordion.Trigger>
	<Accordion.Content>
		<div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
			<MarkdownRenderer
				markdown={releaseBody}
				additionalPlugins={[{ renderer: { li: ListElementRenderer } }]}
				class="prose-sm max-w-full prose-p:my-0"
			/>
			<!-- Open the release on GitHub in a new tab, with a nice hover animation -->
			<Button
				href={release.html_url}
				variant="outline"
				size="sm"
				target="_blank"
				class="group mr-8 mb-2 ml-auto shrink-0 gap-0 transition-colors duration-500 sm:mt-auto sm:ml-4"
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
