<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils";

	type Props = {
		class?: string | undefined | null;
		children?: Snippet;
		[key: string]: unknown;
	};

	let { class: className = undefined, children, ...rest }: Props = $props();
</script>

<div
	class={cn("ml-4 border-l pl-8 [counter-reset:step] [&>.step:not(:first-child)]:mt-8", className)}
	{...rest}
>
	{@render children?.()}
</div>
