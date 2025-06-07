<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { toast } from "svelte-sonner";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import type { Entries } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge";
	import ReactionToast from "$lib/components/ReactionToast.svelte";

	type Props = {
		reactions?: GitHubRelease["reactions"] | undefined;
		reactionItemUrl?: string;
		class?: ClassValue;
	};
	let {
		reactions = undefined,
		reactionItemUrl = undefined,
		class: className = undefined
	}: Props = $props();

	type ReactionKey = Exclude<keyof NonNullable<GitHubRelease["reactions"]>, "url" | "total_count">;
	const reactionsEmojis: Record<ReactionKey, string> = {
		"+1": "👍",
		"-1": "👎",
		laugh: "😄",
		confused: "😕",
		heart: "❤️",
		hooray: "🎉",
		rocket: "🚀",
		eyes: "👀"
	};
	const sortedEmojis: ReactionKey[] = [
		"+1",
		"-1",
		"laugh",
		"hooray",
		"confused",
		"heart",
		"rocket",
		"eyes"
	];
</script>

{#if reactions}
	{@const reactionEntries = Object.entries(reactions)
		.filter(([k, v]) => !["url", "total_count"].includes(k) && !!v)
		.toSorted(([a], [b]) => sortedEmojis.indexOf(a) - sortedEmojis.indexOf(b)) as Entries<
		Record<ReactionKey, number>
	>}
	<div class={["flex flex-wrap gap-1.5", className]}>
		{#each reactionEntries as [key, value] (key)}
			<Badge
				variant="outline"
				class="gap-1.5 text-sm select-none"
				onclick={() =>
					toast(ReactionToast, {
						duration: 5_000,
						componentProps: { href: reactionItemUrl }
					})}
			>
				<span>{reactionsEmojis[key]}</span>
				<span>{value}</span>
			</Badge>
		{/each}
	</div>
{/if}
