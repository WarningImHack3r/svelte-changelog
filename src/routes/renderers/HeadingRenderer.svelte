<script lang="ts">
	import { getAstNode } from "svelte-exmarkdown";

	const node = getAstNode();
</script>

{#if $node.tagName === "h1"}
	<h1 class="text-2xl font-extrabold tracking-tight lg:text-3xl"><slot /></h1>
{:else if $node.tagName === "h2"}
	<h2 class="border-b pb-2 text-xl font-semibold tracking-tight"><slot /></h2>
{:else if $node.tagName === "h3"}
	<h3 class="text-lg font-semibold tracking-tight"><slot /></h3>
{:else if $node.tagName === "h4"}
	<h4 class="font-semibold tracking-tight"><slot /></h4>
{:else if $node.tagName === "h5"}
	<h5><slot /></h5>
{:else if $node.tagName === "h6"}
	<h6><slot /></h6>
{:else}
	<slot />
{/if}
