<script lang="ts">
	let data: HTMLLIElement | undefined = undefined;
</script>

<li bind:this={data} class:font-bold={data?.innerText.startsWith("breaking:")}>
	<slot />
</li>
