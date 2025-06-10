<script lang="ts">
	import PageRenderer from "./PageRenderer.svelte";

	let { data } = $props();

	let comments = $derived("comments" in data.item ? data.item.comments : []);
	let commits = $derived("commits" in data.item ? data.item.commits : []);
	let files = $derived("files" in data.item ? data.item.files : []);
	let linkedEntities = $derived(
		"linkedPrs" in data.item
			? data.item.linkedPrs
			: "linkedIssues" in data.item
				? data.item.linkedIssues
				: []
	);
</script>

<PageRenderer
	metadata={{
		org: data.itemMetadata.org,
		repo: data.itemMetadata.repo,
		type: data.itemMetadata.type
	}}
	info={data.item.info}
	{comments}
	{commits}
	{files}
	{linkedEntities}
	mergedTagName={data.mergedTagName}
/>
