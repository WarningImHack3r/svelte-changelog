<script lang="ts">
	import { ArrowUpRight } from "@lucide/svelte";
	import { Button } from "$lib/components/ui/button";

	type Props = {
		href?: string;
	};
	let { href }: Props = $props();
</script>

<h3 class="text-sm">Sorry, you can't react to stuff here!</h3>
<div class="flex gap-4 mt-1 justify-between">
	<h4 class="text-sm text-muted-foreground">Click here to open this content on GitHub</h4>
	<Button size="sm" variant="secondary" {href} target="_blank" class="group/button">
		<img src="/github.svg" alt="GitHub" class="size-4 dark:invert" />
		<ArrowUpRight
			class="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
		/>
	</Button>
</div>
