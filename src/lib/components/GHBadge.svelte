<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import {
		CircleCheck,
		CircleDot,
		CircleSlash,
		GitMerge,
		GitPullRequestArrow,
		GitPullRequestClosed,
		GitPullRequestDraft,
		type Icon
	} from "@lucide/svelte";

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
		mode: "regular" | "minimal";
		type: PropsObj["type"];
		status: PropsObj["status"];
		class?: ClassValue;
	};

	let { mode = "regular", type, status, class: className = undefined }: Props = $props();

	let icon = $state<typeof Icon>();
	let label = $state("");
	let textColor = $state("");
	let bgColor = $state("");

	switch (type) {
		case "pull":
			switch (status) {
				case "draft":
					icon = GitPullRequestDraft;
					label = "Draft";
					textColor = "text-neutral-500";
					bgColor = "bg-neutral-500";
					break;
				case "open":
					icon = GitPullRequestArrow;
					label = "Open";
					textColor = "text-green-600";
					bgColor = "bg-green-600";
					break;
				case "merged":
					icon = GitMerge;
					label = "Merged";
					textColor = "text-purple-500";
					bgColor = "bg-purple-500";
					break;
				case "closed":
					icon = GitPullRequestClosed;
					label = "Closed";
					textColor = "text-red-500";
					bgColor = "bg-red-500";
					break;
			}
			break;
		case "issue":
			switch (status) {
				case "open":
					icon = CircleDot;
					label = "Open";
					textColor = "text-green-600";
					bgColor = "bg-green-600";
					break;
				case "closed":
					icon = CircleSlash;
					label = "Closed";
					textColor = "text-neutral-500";
					bgColor = "bg-neutral-500";
					break;
				case "solved":
					icon = CircleCheck;
					label = "Solved";
					textColor = "text-purple-500";
					bgColor = "bg-purple-500";
					break;
			}
	}
</script>

{#if mode === "regular"}
	<div class={["flex items-center rounded-full px-4 py-2 text-white", bgColor, className]}>
		{#if icon}
			{@const SvelteComponent = icon}
			<SvelteComponent class="mr-2 size-5" />
		{/if}
		<span class="font-semibold">{label}</span>
	</div>
{:else if icon}
	{@const Component = icon}
	<Component class={["size-6", textColor, className]} />
{/if}
