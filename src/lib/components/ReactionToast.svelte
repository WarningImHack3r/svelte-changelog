<script lang="ts">
	import GitHub from "@icons-pack/svelte-simple-icons/icons/SiGithub";
	import { ArrowUpRight } from "@lucide/svelte";
	import AnimatedButton from "./AnimatedButton.svelte";

	type Props = {
		href?: string;
	};
	let { href }: Props = $props();
</script>

<h3 class="text-sm">Sorry, you can't react to stuff here!</h3>
<div class="mt-1 flex justify-between gap-4">
	<h4 class="text-sm text-muted-foreground">Click here to open this content on GitHub</h4>
	<AnimatedButton size="sm" variant="secondary" {href} target="_blank" class="group/button">
		<GitHub title="GitHub" />
		<ArrowUpRight
			class="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
		/>
	</AnimatedButton>
</div>
