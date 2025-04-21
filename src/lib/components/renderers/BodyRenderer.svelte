<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Action } from "svelte/action";
	import { page } from "$app/state";

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();

	const linkify: Action = node => {
		let replaced = node.innerHTML;
		const issuesCandidates = replaced.matchAll(/ #(\d+)/g) || [];
		for (let [wholeMatch, matchedGroup] of issuesCandidates) {
			if (!matchedGroup) continue;
			replaced = replaced.replace(
				wholeMatch,
				` <a href="https://github.com/${page.data.itemMetadata.org}/${page.data.itemMetadata.repo}/issues/${matchedGroup}">${wholeMatch.trim()}</a>`
			);
		}
		node.innerHTML = replaced;
	};
</script>

<p use:linkify>
	{@render children?.()}
</p>
