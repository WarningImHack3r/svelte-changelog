<script lang="ts">
	export let data;

	// let resolvedClosingIssues;

	$: if (data.pullOrIssue === "pull") {
		// TODO: get resolved issues from GraphQL API (not available with REST)
	}
</script>

<svelte:head>
	<title>Detail of {data.org}/{data.repo}#{data.id} | Svelte Changelog</title>
</svelte:head>
