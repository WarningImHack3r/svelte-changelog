<script lang="ts">
	import { cn } from "$lib/utils";

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<div
	class={cn("ml-4 border-l pl-8 [counter-reset:step] [&>.step:not(:first-child)]:mt-8", className)}
	{...$$restProps}
>
	<slot />
</div>
