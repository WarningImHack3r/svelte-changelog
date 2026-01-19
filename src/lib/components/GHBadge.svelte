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

	type BadgeConfig = {
		icon: typeof Icon;
		label: string;
		color: "green" | "neutral" | "purple" | "red";
	};

	const BADGE_CONFIG: Record<string, Record<string, BadgeConfig>> = {
		pull: {
			draft: { icon: GitPullRequestDraft, label: "Draft", color: "neutral" },
			open: { icon: GitPullRequestArrow, label: "Open", color: "green" },
			merged: { icon: GitMerge, label: "Merged", color: "purple" },
			closed: { icon: GitPullRequestClosed, label: "Closed", color: "red" }
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
	} as const;

	const COLOR_MAP = {
		green: { text: "text-green-600", bg: "bg-green-600" },
		neutral: { text: "text-neutral-500", bg: "bg-neutral-500" },
		purple: { text: "text-purple-500", bg: "bg-purple-500" },
		red: { text: "text-red-500", bg: "bg-red-500" }
	} as const;

	type Props = {
		mode?: "regular" | "minimal";
		type: PropsObj["type"];
		status: PropsObj["status"];
		class?: ClassValue;
	};

	type Info = {
		icon: typeof Icon | undefined;
		label: string;
		textColor: string;
		bgColor: string;
	};

	const FALLBACK_INFO: Info = {
		icon: undefined,
		label: "",
		textColor: "",
		bgColor: ""
	} as const;

	let { mode = "regular", type, status, class: className = undefined }: Props = $props();

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
		const config = BADGE_CONFIG[type]?.[status];

		if (!config) {
			return FALLBACK_INFO;
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
