<script lang="ts">
	let { data } = $props();
</script>

{#await data.releases then release}
	{JSON.stringify(release, null, 2)}
{/await}
