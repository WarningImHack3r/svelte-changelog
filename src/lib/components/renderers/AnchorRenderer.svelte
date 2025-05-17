<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { page } from "$app/state";

	type Props = {
		children?: Snippet;
		[k: string]: unknown;
	};
	let { children, ...rest }: Props = $props();

	const shorten: Attachment = node => {
		const originalText = node.innerText;
		const shorteningCandidates = originalText
			.trim()
			.match(/https:\/\/github.com\/(\S+)\/(\S+)\/\S+\/(\d+)/);
		if (!shorteningCandidates || shorteningCandidates.length < 4) return;
		const [wholeMatch, org, repo, number] = shorteningCandidates;
		node.innerText =
			org === page.data.itemMetadata.org && repo === page.data.itemMetadata.repo
				? originalText.replace(wholeMatch, `#${number}`)
				: originalText.replace(wholeMatch, `${org}/${repo}#${number}`);
	};
</script>

<a {...rest} {@attach shorten}>
	{@render children?.()}
</a>
