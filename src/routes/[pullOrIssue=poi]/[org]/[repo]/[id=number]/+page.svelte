<script lang="ts">
	import PageRenderer from "./PageRenderer.svelte";

	let { data } = $props();

	let comments = $derived("comments" in data.item ? data.item.comments : []);
	let commits = $derived("commits" in data.item ? data.item.commits : []);
	let files = $derived("files" in data.item ? data.item.files : []);
	let linkedEntities = $derived(
		"linkedPrs" in data.item ? data.item.linkedPrs : data.item.linkedIssues
	);
</script>

<svelte:head>
	<title
		>Detail of {data.itemMetadata.org}/{data.itemMetadata.repo}#{data.itemMetadata.id} | Svelte Changelog</title
	>
</svelte:head>

<PageRenderer
	metadata={data.itemMetadata}
	info={data.item.info}
	{comments}
	{commits}
	{files}
	{linkedEntities}
/>
