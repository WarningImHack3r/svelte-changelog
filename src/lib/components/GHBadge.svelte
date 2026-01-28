<script lang="ts" module>
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

	const COLOR_MAP = {
		green: { text: "text-green-600", bg: "bg-green-600" },
		neutral: { text: "text-neutral-500", bg: "bg-neutral-500" },
		purple: { text: "text-purple-500", bg: "bg-purple-500" },
		red: { text: "text-red-500", bg: "bg-red-500" }
	} as const;

	type CommonStatus = "open" | "closed";

	type GithubStatus = {
		pull: CommonStatus | "draft" | "merged";
		issue: CommonStatus | "solved";
		discussion: CommonStatus;
	};

	type BadgeConfig = {
		icon: typeof Icon;
		label: string;
		color: keyof typeof COLOR_MAP;
	};

	const BADGE_MAP: {
		[GithubType in keyof GithubStatus]: Record<GithubStatus[GithubType], BadgeConfig>;
	} = {
		pull: {
			open: { icon: GitPullRequestArrow, label: "Open", color: "green" },
			closed: { icon: GitPullRequestClosed, label: "Closed", color: "red" },
			draft: { icon: GitPullRequestDraft, label: "Draft", color: "neutral" },
			merged: { icon: GitMerge, label: "Merged", color: "purple" }
		},
		issue: {
			open: { icon: CircleDot, label: "Open", color: "green" },
			closed: { icon: CircleSlash, label: "Closed", color: "neutral" },
			solved: { icon: CircleCheck, label: "Solved", color: "purple" }
		},
		discussion: {
			open: { icon: MessageSquare, label: "Open", color: "green" },
			closed: { icon: MessageSquareX, label: "Closed", color: "purple" }
		}
	};
</script>

<script lang="ts" generics="GithubType extends keyof GithubStatus">
	import type { ClassValue } from "svelte/elements";

	type Props = {
		mode?: "regular" | "minimal";
		type: GithubType;
		status: GithubStatus[GithubType];
		class?: ClassValue;
	};

	let { mode = "regular", type, status, class: className }: Props = $props();

	type Badge = {
		icon: typeof Icon | undefined;
		label: string;
		textColor: string;
		bgColor: string;
	};

	let badge = $derived.by<Badge>(() => {
		const config = BADGE_MAP[type]?.[status];

		if (!config) {
			return {
				icon: undefined,
				label: "",
				textColor: "",
				bgColor: ""
			};
		}

		const color = COLOR_MAP[config.color];
		return {
			icon: config.icon,
			label: config.label,
			textColor: color.text,
			bgColor: color.bg
		};
	});
</script>

{#if mode === "regular"}
	<div class={["flex items-center rounded-full px-4 py-2 text-white", badge.bgColor, className]}>
		<badge.icon class="mr-2 size-5" />
		<span class="font-semibold">{badge.label}</span>
	</div>
{:else}
	<badge.icon class={["size-6", badge.textColor, className]} />
{/if}
