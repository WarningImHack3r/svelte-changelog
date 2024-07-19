<script lang="ts">
	import { page } from "$app/stores";
	let data: HTMLParagraphElement | undefined = undefined;

	const org = $page.data.org;
	const repo = $page.data.repo;

	$: if (data) {
		let replaced = data.innerHTML;
		const issuesCandidates = replaced.match(/ #(\d+) /g) || [];
		for (let candidate of issuesCandidates) {
			replaced = replaced.replace(
				candidate,
				` <a href="https://github.com/${org}/${repo}/issues/${candidate.trim().replace("#", "")}">${candidate.trim()}</a> `
			);
		}
		data.innerHTML = replaced;
	}
</script>

<p bind:this={data}>
	<slot />
</p>
