<script lang="ts" module>
	export const animatedClasses = "transition-transform active:scale-[0.97]";
</script>

<script lang="ts">
	import Button, { type ButtonProps } from "./ui/button/button.svelte";

	let { class: className, ...rest }: ButtonProps = $props();
</script>

<Button {...rest} class={[className, rest.variant !== "link" && animatedClasses]} />
