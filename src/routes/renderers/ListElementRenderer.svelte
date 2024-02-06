<script lang="ts">
	let data: HTMLLIElement | undefined = undefined;
</script>

<li
	bind:this={data}
	class:font-bold={data?.innerText.startsWith("breaking:")}
	class:font-semibold={data?.innerText.startsWith("breaking:")}
>
	<slot />
</li>
