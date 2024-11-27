<script lang="ts">
	import type { Snippet } from "svelte";
	import { ArrowRight } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button";

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();

	let data = $state<HTMLLIElement>();
	let pullsLinks: string[] = [];
	let issuesLinks: string[] = [];
	let allLinks = $derived.by(() => {
		if (data) {
			const links = data.innerHTML.match(/https?:\/\/[^"]+/g) || [];
			for (const link of links) {
				if (link.includes("/pull/")) {
					pullsLinks.push(link);
				} else if (link.includes("/issues/")) {
					issuesLinks.push(link);
				}
			}
			return [...pullsLinks, ...issuesLinks];
		}
		return [];
	});

	/**
	 * Replaces a link with `https://github.com/username/repo/[pull|issues]/123`
	 * format to `/[pull|issues]/username/repo/123`
	 *
	 * @param link - The link to transform
	 */
	function ghLinkToHref(link: string) {
		return link.replace(
			/https:\/\/github.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/,
			"/$3/$1/$2/$4"
		);
	}
</script>

<li
	bind:this={data}
	class:dark:font-bold={data?.innerText.startsWith("breaking:")}
	class:font-semibold={data?.innerText.startsWith("breaking:")}
	class="group *:inline"
>
	{@render children?.()}
	{#if allLinks.length > 0}
		<Button
			href={ghLinkToHref(allLinks[0] ?? "")}
			variant="link"
			class="ml-2 !inline-flex h-auto p-0 transition-[transform,_opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:ml-4 md:-translate-x-2 md:opacity-0 lg:mr-8"
		>
			Open details
			<ArrowRight class="ml-2 size-4" />
		</Button>
	{/if}
</li>
