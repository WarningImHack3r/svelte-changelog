<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();
	let data = $state<HTMLParagraphElement>();

	$effect(() => {
		if (!data) return;
		let replaced = data.innerHTML;
		const issuesCandidates = replaced.matchAll(/ #(\d+)/g) || [];
		for (let candidate of issuesCandidates) {
			const wholeMatch = candidate[0];
			const matchedGroup = candidate[1];
			if (!wholeMatch || !matchedGroup) continue;
			replaced = replaced.replace(
				wholeMatch,
				` <a href="https://github.com/${page.data.org}/${page.data.repo}/issues/${matchedGroup}">${wholeMatch.trim()}</a>`
			);
		}
		// FIXME: change that mechanism to get rid of that warning
		// eslint-disable-next-line svelte/no-dom-manipulating
		data.innerHTML = replaced;
	});
</script>

<p bind:this={data}>
	{@render children?.()}
</p>
