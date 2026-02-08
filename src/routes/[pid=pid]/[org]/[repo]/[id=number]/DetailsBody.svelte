<script lang="ts">
	import type { ClassValue, HTMLAttributes, SvelteHTMLElements } from "svelte/elements";
	import { resolve } from "$app/paths";
	import { ChevronRight } from "@lucide/svelte";
	import rehypeSlug from "rehype-slug";
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import type { GitHubRelease } from "$lib/server/github-cache";
	import type { ConditionalKeys, RemoveIndexSignature } from "$lib/types";
	import { Button } from "$lib/components/ui/button";
	import * as HoverCard from "$lib/components/ui/hover-card";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import LinkRenderer from "$lib/components/renderers/LinkRenderer.svelte";
	import { shikiPlugin } from "./syntax-highlighting";

	type Props = {
		body?: string | null | undefined;
		currentRepo: { owner: string; name: string };
		renderSlug?: boolean;
		reactions?: GitHubRelease["reactions"] | undefined;
		reactionItemUrl?: string;
		class?: ClassValue;
	};

	let {
		body,
		currentRepo,
		renderSlug = false,
		reactions,
		reactionItemUrl,
		class: className
	}: Props = $props();
</script>

{#snippet headingRenderer(
	heading: ConditionalKeys<RemoveIndexSignature<SvelteHTMLElements>, `h${number}`>,
	{ children, id, class: className, ...props }: HTMLAttributes<HTMLHeadingElement>
)}
	{@const shouldRender = id && renderSlug}
	<svelte:element
		this={heading}
		id={shouldRender ? id : undefined}
		class={[className, shouldRender && "group scroll-mt-20"]}
		{...props}
	>
		{@render children?.()}
		{#if shouldRender}
			<a href="#{id}" class="transition-colors not-group-hover:text-muted-foreground/50">#</a>
		{/if}
	</svelte:element>
{/snippet}

<div class={className}>
	<MarkdownRenderer
		markdown={body || "_No description provided_"}
		parseRawHtml
		class="max-w-full"
		additionalPlugins={[
			{
				remarkPlugin: [remarkGitHub, { repository: `${currentRepo.owner}/${currentRepo.name}` }]
			},
			{ remarkPlugin: remarkGemoji },
			{ rehypePlugin: rehypeSlug },
			shikiPlugin
		]}
	>
		{#snippet h1(props)}
			{@render headingRenderer("h1", props)}
		{/snippet}
		{#snippet h2(props)}
			{@render headingRenderer("h2", props)}
		{/snippet}
		{#snippet h3(props)}
			{@render headingRenderer("h3", props)}
		{/snippet}
		{#snippet h4(props)}
			{@render headingRenderer("h4", props)}
		{/snippet}
		{#snippet h5(props)}
			{@render headingRenderer("h5", props)}
		{/snippet}
		{#snippet h6(props)}
			{@render headingRenderer("h6", props)}
		{/snippet}
		{#snippet a(props)}
			{@const { href, children, ...rest } = props}
			<LinkRenderer attributes={props}>
				{#snippet linkChildren(original)}
					{@const match = (href ?? "").match(
						/^https:\/\/github.com\/(\S+)\/(\S+)\/(\S+)\/(\d+)(#[a-z]+-\d+)?$/
					)}
					{#if href && match}
						{@const [, org, repo, pid, id] = [...match]}
						<HoverCard.Root openDelay={300}>
							<HoverCard.Content class="flex w-fit items-center justify-center px-6">
								<Button
									variant="link"
									href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
										pid: pid ?? "",
										org: org ?? "",
										repo: repo ?? "",
										id: id ?? ""
									})}
									class="group h-auto p-0! text-base"
								>
									Open in Svelte Changelog
									<ChevronRight class="transition-transform group-hover:translate-x-1" />
								</Button>
							</HoverCard.Content>
							<HoverCard.Trigger>
								{#snippet child({ props: cardProps })}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a {...cardProps} {...rest} {href}>
										{@render children?.()}
									</a>
								{/snippet}
							</HoverCard.Trigger>
						</HoverCard.Root>
					{:else}
						{@render original()}
					{/if}
				{/snippet}
			</LinkRenderer>
		{/snippet}
	</MarkdownRenderer>
	{#if reactions}
		<Reactions {reactions} {reactionItemUrl} class="mt-4" />
	{/if}
</div>
