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
		type Icon,
		MessageSquare,
		MessageSquareX
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
		  }
		| {
				type: "discussion";
				status: CommonStatus;
		  };

	type Props = {
		mode?: "regular" | "minimal";
		type: PropsObj["type"];
		status: PropsObj["status"];
		class?: ClassValue;
	};

	let { mode = "regular", type, status, class: className = undefined }: Props = $props();

	type Info = {
		icon: typeof Icon | undefined;
		label: string;
		textColor: string;
		bgColor: string;
	};

	let { icon, label, textColor, bgColor } = $derived.by<Info>(() => {
		switch (type) {
			case "pull":
				switch (status) {
					case "draft":
						return {
							icon: GitPullRequestDraft,
							label: "Draft",
							textColor: "text-neutral-500",
							bgColor: "bg-neutral-500"
						};
					case "open":
						return {
							icon: GitPullRequestArrow,
							label: "Open",
							textColor: "text-green-600",
							bgColor: "bg-green-600"
						};
					case "merged":
						return {
							icon: GitMerge,
							label: "Merged",
							textColor: "text-purple-500",
							bgColor: "bg-purple-500"
						};
					case "closed":
						return {
							icon: GitPullRequestClosed,
							label: "Closed",
							textColor: "text-red-500",
							bgColor: "bg-red-500"
						};
				}
				break;
			case "issue":
				switch (status) {
					case "open":
						return {
							icon: CircleDot,
							label: "Open",
							textColor: "text-green-600",
							bgColor: "bg-green-600"
						};
					case "closed":
						return {
							icon: CircleSlash,
							label: "Closed",
							textColor: "text-neutral-500",
							bgColor: "bg-neutral-500"
						};
					case "solved":
						return {
							icon: CircleCheck,
							label: "Solved",
							textColor: "text-purple-500",
							bgColor: "bg-purple-500"
						};
				}
				break;
			case "discussion":
				switch (status) {
					case "open":
						return {
							icon: MessageSquare,
							label: "Open",
							textColor: "text-green-600",
							bgColor: "bg-green-600"
						};
					case "closed":
						return {
							icon: MessageSquareX,
							label: "Closed",
							textColor: "text-purple-500",
							bgColor: "bg-purple-500"
						};
				}
				break;
		}
		return {
			icon: undefined,
			label: "",
			textColor: "",
			bgColor: ""
		};
	});
</script>

{#if mode === "regular"}
	<div class={["flex items-center rounded-full px-4 py-2 text-white", bgColor, className]}>
		{#if icon}
			{@const Component = icon}
			<Component class="mr-2 size-5" />
		{/if}
		<span class="font-semibold">{label}</span>
	</div>
{:else if icon}
	{@const Component = icon}
	<Component class={["size-6", textColor, className]} />
{/if}
