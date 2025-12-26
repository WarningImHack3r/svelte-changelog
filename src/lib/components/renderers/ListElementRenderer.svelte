<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { ArrowRight } from "@lucide/svelte";
	import { Button } from "$lib/components/ui/button";

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();

	let allLinks = $state<string[]>([]);
	let isBreaking = $state(false);
	const linksFinder: Attachment<HTMLLIElement> = node => {
		const pullsLinks: string[] = [];
		const issuesLinks: string[] = [];
		const links = node.innerHTML.match(/https?:\/\/[^"]+/g) ?? [];
		for (const link of links) {
			if (link.includes("/pull/")) {
				pullsLinks.push(link);
			} else if (link.includes("/issues/")) {
				issuesLinks.push(link);
			}
		}

		allLinks = [...pullsLinks, ...issuesLinks];
		isBreaking = node.innerText.trim().startsWith("breaking:");
	};

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
	{@attach linksFinder}
	class={["group text-pretty *:inline", isBreaking && "font-semibold dark:font-bold"]}
>
	{@render children?.()}
	{#if allLinks.length > 0}
		<Button
			href={ghLinkToHref(allLinks[0] ?? "")}
			variant="link"
			class="ml-2 inline-flex! h-auto p-0! transition-[translate,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:ml-4 md:-translate-x-2 md:opacity-0 lg:mr-8"
		>
			Open details
			<ArrowRight class="size-4" />
		</Button>
	{/if}
</li>
