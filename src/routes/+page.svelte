<script lang="ts">
	import { Octokit } from "octokit";
	import { ArrowUpRight, Loader2 } from "lucide-svelte";
	import SvelteMarkdown from "svelte-markdown";
	import { localStorageStore } from "$lib/localStorageStore";
	import { cn } from "$lib/utils";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Tabs from "$lib/components/ui/tabs";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import HeadingRenderer from "./renderers/HeadingRenderer.svelte";
	import LinkRenderer from "./renderers/LinkRenderer.svelte";
	import ListRenderer from "./renderers/ListRenderer.svelte";

	// Repositories to fetch releases from
	const repos = {
		svelte: "Svelte",
		kit: "SvelteKit"
	};
	let currentRepo: keyof typeof repos = "svelte";

	// Svelte setting
	let displayBetaReleases = localStorageStore("displayBetaReleases", true);

	// SvelteKit setting
	const nonKitReleasesOptions = ["show", "dim", "hide"] as const;
	let nonKitReleasesDisplay = localStorageStore<(typeof nonKitReleasesOptions)[number]>(
		"nonKitReleasesDisplay",
		"dim"
	);

	// GitHub API client
	const octokit = new Octokit();
</script>

<div class="container py-8">
	<h2 class="text-3xl font-bold">
		<span class="text-primary">{repos[currentRepo]}</span>
		Releases
	</h2>
	<Tabs.Root bind:value={currentRepo} class="mt-8">
		<div class="flex items-center justify-between">
			<Tabs.List>
				{#each Object.entries(repos) as [id, name]}
					<Tabs.Trigger value={id}>{name}</Tabs.Trigger>
				{/each}
			</Tabs.List>
			{#if currentRepo === "svelte"}
				<div class="flex items-center space-x-2">
					<Checkbox
						id="beta-releases"
						bind:checked={$displayBetaReleases}
						aria-labelledby="beta-releases-label"
					/>
					<Label
						id="beta-releases-label"
						for="beta-releases"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Show beta releases
					</Label>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Non-SvelteKit releases:</span>
					<ToggleGroup.Root
						bind:value={$nonKitReleasesDisplay}
						size="sm"
						class="scale-90 rounded-md outline outline-offset-4 outline-input"
					>
						{#each nonKitReleasesOptions as option}
							<ToggleGroup.Item value={option}>
								{option.charAt(0).toUpperCase() + option.slice(1)}
							</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				</div>
			{/if}
		</div>
		{#each Object.entries(repos) as [repo, name]}
			<Tabs.Content value={repo}>
				{#await octokit.rest.repos.listReleases({ owner: "sveltejs", repo: repo, per_page: 50 })}
					<p class="flex items-center justify-center text-xl">
						<Loader2 class="mr-2 size-4 animate-spin" />
						Loading...
					</p>
				{:then { data }}
					<Accordion.Root
						multiple
						value={data
							.filter(release => {
								const isLessThanAWeekOld =
									new Date(release.created_at).getTime() >
									new Date().getTime() - 1000 * 60 * 60 * 24 * 7;
								return (
									isLessThanAWeekOld &&
									(repo === "kit" ? release.name?.startsWith("@sveltejs/kit") : true)
								);
							})
							.map(release => release.id.toString())}
					>
						{#each data.filter(release => {
							if (repo === "svelte" && release.prerelease) return $displayBetaReleases;
							if (repo === "kit" && !release.name?.startsWith("@sveltejs/kit")) return $nonKitReleasesDisplay !== "hide";
							return true;
						}) as release (release.id)}
							<Accordion.Item value={release.id.toString()}>
								<Accordion.Trigger class="group items-baseline hover:no-underline">
									<span
										class="text-lg group-hover:underline"
										class:text-muted-foreground={repo === "kit" &&
											!release.name?.startsWith("@sveltejs/kit") &&
											$nonKitReleasesDisplay === "dim"}
									>
										{release.name}
									</span>
									<span class="ml-1.5 mr-auto text-sm text-muted-foreground">
										• {new Date(release.created_at).toLocaleDateString()}
									</span>
								</Accordion.Trigger>
								<Accordion.Content>
									<div class="flex items-end justify-between">
										<div>
											<SvelteMarkdown
												source={release.body}
												renderers={{
													heading: HeadingRenderer,
													list: ListRenderer,
													link: LinkRenderer
												}}
												options={{ gfm: true }}
											/>
										</div>
										<Button href={release.html_url} target="_blank" class="group mb-4 mr-8">
											Open release
											<ArrowUpRight
												class="ml-2 size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
											/>
										</Button>
									</div>
								</Accordion.Content>
							</Accordion.Item>
						{/each}
					</Accordion.Root>
					<span class="mt-8 flex justify-center">
						<em class="text-sm text-muted-foreground">
							{data.length} results are shown. If you want to see more releases, please visit the
							<a
								href="https://github.com/sveltejs/{repo}/releases"
								target="_blank"
								class={cn(
									buttonVariants({
										variant: "link"
									}),
									"h-auto p-0"
								)}
							>
								{name}'s releases page
							</a>.
						</em>
					</span>
				{:catch error}
					<p class="text-red-500">{error.message}</p>
				{/await}
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>
