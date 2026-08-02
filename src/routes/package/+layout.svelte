<script lang="ts">
	import { initPackageSettings } from "./settings.svelte";

	let { children } = $props();

	initPackageSettings();
</script>

{@render children?.()}
