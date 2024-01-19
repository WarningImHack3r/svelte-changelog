<script lang="ts">
	import { cn } from "$lib/utils";
	import { buttonVariants } from "$lib/components/ui/button";

	export let href: string;
</script>

<a
	{href}
	target="_blank"
	class={cn(
		buttonVariants({
			variant: "link"
		}),
		"h-auto p-0"
	)}
>
	<slot />
</a>
