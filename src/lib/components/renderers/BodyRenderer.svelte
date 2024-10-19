<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/stores";

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();
	let data = $state<HTMLParagraphElement>();

	const org = $page.data.org;
	const repo = $page.data.repo;

	$effect(() => {
		if (data) {
			let replaced = data.innerHTML;
			const issuesCandidates = replaced.matchAll(/ #(\d+)/g) || [];
			for (let candidate of issuesCandidates) {
				const wholeMatch = candidate[0];
				const matchedGroup = candidate[1];
				if (!wholeMatch || !matchedGroup) continue;
				replaced = replaced.replace(
					wholeMatch,
					` <a href="https://github.com/${org}/${repo}/issues/${matchedGroup}">${wholeMatch.trim()}</a>`
				);
			}
			data.innerHTML = replaced;
		}
	});
</script>

<p bind:this={data}>
	{@render children?.()}
</p>
