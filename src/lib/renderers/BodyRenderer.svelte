<script lang="ts">
	import { page } from "$app/stores";
	let data: HTMLParagraphElement | undefined = undefined;

	const org = $page.data.org;
	const repo = $page.data.repo;

	$: if (data) {
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
</script>

<p bind:this={data}>
	<slot />
</p>
