<script lang="ts">
	import type { ComponentType } from "svelte";
	import type { Icon } from "lucide-svelte";
	import GitMerge from "lucide-svelte/icons/git-merge";
	import CircleCheck from "lucide-svelte/icons/circle-check";
	import CircleDot from "lucide-svelte/icons/circle-dot";
	import CircleSlash from "lucide-svelte/icons/circle-slash";
	import GitPullRequestArrow from "lucide-svelte/icons/git-pull-request-arrow";
	import GitPullRequestClosed from "lucide-svelte/icons/git-pull-request-closed";
	import GitPullRequestDraft from "lucide-svelte/icons/git-pull-request-draft";

	export let type:
		| "pr-draft"
		| "pr-open"
		| "pr-closed"
		| "pr-merged"
		| "issue-open"
		| "issue-closed"
		| "issue-solved";

	let icon: ComponentType<Icon> | null = null;
	let label = "";
	let color = "";

	switch (type) {
		case "pr-draft":
			icon = GitPullRequestDraft;
			label = "Draft";
			color = "bg-neutral-500";
			break;
		case "pr-open":
			icon = GitPullRequestArrow;
			label = "Open";
			color = "bg-green-500";
			break;
		case "pr-merged":
			icon = GitMerge;
			label = "Merged";
			color = "bg-purple-500";
			break;
		case "pr-closed":
			icon = GitPullRequestClosed;
			label = "Closed";
			color = "bg-red-500";
			break;
		case "issue-open":
			icon = CircleDot;
			label = "Open";
			color = "bg-green-500";
			break;
		case "issue-closed":
			icon = CircleSlash;
			label = "Closed";
			color = "bg-neutral-500";
			break;
		case "issue-solved":
			icon = CircleCheck;
			label = "Solved";
			color = "bg-purple-500";
			break;
	}
</script>

<div class="flex items-center rounded-full px-4 py-2 text-white {color}">
	{#if icon}
		<svelte:component this={icon} class="mr-2 size-5" />
	{/if}
	<span class="font-semibold">{label}</span>
</div>
