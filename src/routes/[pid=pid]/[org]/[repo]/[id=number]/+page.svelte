<script lang="ts">
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import PageRenderer from "./PageRenderer.svelte";

	$effect(() => {
		// removes stuff like `#issuecomment-xxx` from the GH redirection
		// (query params are removed by default by SvelteKit, but not hashes for some reason)
		if (page.url.hash) {
			// this would technically nuke hashes I could choose to add in the future, but it's not a thing now sooo
			replaceState("", {});
		}
	});

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
