<script lang="ts">
	import type { ResolvedPathname } from "$app/types";
	import { FileDiff } from "@lucide/svelte";
	import type { PullRequestDetails } from "$lib/server/github-cache";
	import { Separator } from "$lib/components/ui/separator";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import DiffRenderer, { parsePatchFiles } from "./DiffRenderer.svelte";
	import { highlighter } from "./syntax-highlighting";

	type Props = {
		route: ResolvedPathname;
		files?: PullRequestDetails["files"];
	};

	let { route, files = [] }: Props = $props();

	let deletions = $derived(files.reduce((acc, file) => acc + file.deletions, 0));
	let additions = $derived(files.reduce((acc, file) => acc + file.additions, 0));

	// this might be misordered, but seems to follow the registration order and works so far
	const [lightTheme, darkTheme] = highlighter
		.getLoadedThemes()
		.map(theme => highlighter.getTheme(theme));
</script>

<BottomCollapsible
	icon={FileDiff}
	label="Files"
	secondaryLabel="{files.length} file{files.length > 1 ? 's' : ''}"
	style="--accordion-bg: light-dark({lightTheme?.bg}, {darkTheme?.bg})"
	class="[&_*]:data-accordion-content:-mx-4 [&_*]:data-accordion-content:flex [&_*]:data-accordion-content:flex-col [&_*]:data-accordion-content:gap-2 [&_*]:data-accordion-content:overflow-visible [&_*]:data-accordion-content:rounded-b-md [&_*]:data-accordion-content:bg-(--accordion-bg) [&_*]:data-accordion-content:px-4"
>
	{#each files as file, i (file.filename)}
		<!-- this should effectively always be a 1-sized array -->
		{@const patches = parsePatchFiles(file)}
		{#each patches as patch, j (patch.name)}
			{#if i + j > 0}
				<Separator />
			{/if}
			<DiffRenderer
				{route}
				fileDiff={patch}
				langs={highlighter.getLoadedLanguages()}
				options={{
					theme: { light: lightTheme?.name ?? "", dark: darkTheme?.name ?? "" }
				}}
			/>
		{:else}
			{#if i > 0}
				<Separator />
			{/if}
			<div class="my-4 font-semibold">No diff found for <code>{file.filename}</code>, it's likely too big! :(</div>
		{/each}
	{/each}
	<Separator />
	<div class="mt-4 flex items-center justify-between">
		<span class="font-semibold">Total</span>
		<span class="space-x-0.5 font-mono">
			{#if deletions}
				<span class="text-destructive">
					-{deletions}
				</span>
			{/if}
			{#if additions}
				<span class="text-green-500">
					+{additions}
				</span>
			{/if}
		</span>
	</div>
</BottomCollapsible>
