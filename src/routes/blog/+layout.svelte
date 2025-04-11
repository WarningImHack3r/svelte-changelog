<script lang="ts">
	import { page } from "$app/state";

	let { children } = $props();
</script>

<article
	class="mx-auto my-8 prose dark:prose-invert prose-h1:text-primary prose-a:text-primary prose-a:no-underline prose-a:underline-offset-4 prose-a:hover:underline"
>
	<h1>{page.route.id?.substring(page.route.id?.lastIndexOf("/") + 1) ?? 0}</h1>
	{@render children()}
</article>
