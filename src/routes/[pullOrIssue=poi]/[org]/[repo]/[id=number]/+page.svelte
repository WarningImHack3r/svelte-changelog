<script lang="ts">
	import { LoaderCircle } from "@lucide/svelte";
	import type { Issues, LinkedEntity, Pulls } from "./types";
	import PageRenderer from "./PageRenderer.svelte";

	let { data } = $props();

	// PR issues or issue PRs
	let linkedPRsOrIssues = $state<LinkedEntity[]>();

	// PR
	let prInfo = $state<{
		info: Awaited<ReturnType<Pulls["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
		commits: Awaited<ReturnType<Pulls["listCommits"]>>["data"] | undefined;
		files: Awaited<ReturnType<Pulls["listFiles"]>>["data"] | undefined;
	}>({
		info: undefined,
		comments: undefined,
		commits: undefined,
		files: undefined
	});

	// Issue
	let issueInfo = $state<{
		info: Awaited<ReturnType<Issues["get"]>>["data"] | undefined;
		comments: Awaited<ReturnType<Issues["listComments"]>>["data"] | undefined;
	}>({
		info: undefined,
		comments: undefined
	});

	let info = $derived(prInfo.info || issueInfo.info);
</script>

<svelte:head>
	<title>Detail of {data.org}/{data.repo}#{data.id} | Svelte Changelog</title>
</svelte:head>

{#if info}
	<PageRenderer
		{info}
		comments={prInfo.comments || issueInfo.comments || []}
		commits={prInfo.commits || []}
		files={prInfo.files || []}
		linkedEntities={linkedPRsOrIssues || []}
	/>
{:else}
	<span class="container mt-16 flex items-center gap-2 text-2xl font-semibold tracking-tight">
		<LoaderCircle class="size-6 animate-spin" />
		Loading info...
	</span>
{/if}
