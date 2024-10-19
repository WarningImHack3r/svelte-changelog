<script lang="ts">
	import type { ComponentType } from "svelte";
	import {
		CircleCheck,
		CircleDot,
		CircleSlash,
		GitMerge,
		GitPullRequestArrow,
		GitPullRequestClosed,
		GitPullRequestDraft,
		type Icon
	} from "lucide-svelte";

	type CommonStatus = "open" | "closed";
	type PropsObj =
		| {
				type: "pull";
				status: "draft" | CommonStatus | "merged";
		  }
		| {
				type: "issue";
				status: CommonStatus | "solved";
		  };

	type Props = {
		type: PropsObj["type"];
		status: PropsObj["status"];
	}

	let { type, status }: Props = $props();

	let icon = $state<ComponentType<Icon>>();
	let label = $state("");
	let color = $state("");

	switch (type) {
		case "pull":
			switch (status) {
				case "draft":
					icon = GitPullRequestDraft;
					label = "Draft";
					color = "bg-neutral-500";
					break;
				case "open":
					icon = GitPullRequestArrow;
					label = "Open";
					color = "bg-green-600";
					break;
				case "merged":
					icon = GitMerge;
					label = "Merged";
					color = "bg-purple-500";
					break;
				case "closed":
					icon = GitPullRequestClosed;
					label = "Closed";
					color = "bg-red-500";
					break;
			}
			break;
		case "issue":
			switch (status) {
				case "open":
					icon = CircleDot;
					label = "Open";
					color = "bg-green-600";
					break;
				case "closed":
					icon = CircleSlash;
					label = "Closed";
					color = "bg-neutral-500";
					break;
				case "solved":
					icon = CircleCheck;
					label = "Solved";
					color = "bg-purple-500";
					break;
			}
	}
</script>

<div class="flex items-center rounded-full px-4 py-2 text-white {color}">
	{#if icon}
		{@const SvelteComponent = icon}
		<SvelteComponent class="mr-2 size-5" />
	{/if}
	<span class="font-semibold">{label}</span>
</div>
