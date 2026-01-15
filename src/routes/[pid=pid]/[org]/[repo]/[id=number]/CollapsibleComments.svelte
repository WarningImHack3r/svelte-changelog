<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import { MessagesSquare } from "@lucide/svelte";
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import type { DiscussionDetails, ItemDetails } from "$lib/server/github-cache";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Separator } from "$lib/components/ui/separator";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import LinkRenderer from "$lib/components/renderers/LinkRenderer.svelte";
	import BottomCollapsible from "./BottomCollapsible.svelte";
	import { dateTimeFormatter } from "./formatters";
	import { shikiPlugin } from "./syntax-highlighting";

	type Props = {
		itemId: number;
		comments?: ItemDetails["comments"] | DiscussionDetails["comments"];
		currentRepo: { owner: string; name: string };
	};

	let { itemId, comments = [], currentRepo }: Props = $props();

	/**
	 * Sort comments for discussions so that they simply have to be indented
	 * if answers to properly look like threads of comments.
	 *
	 * @param comms the input comments
	 * @returns the sorted comments
	 */
	function sortComments(comms: NonNullable<Props["comments"]>): NonNullable<Props["comments"]> {
		// Check if the array contains discussion items (with `parent_id`)
		// We only need to check the first item since we know all items are of the same type
		const hasParentId = comms[0] && "parent_id" in comms[0];

		// If these are simple items, sort by date and return
		if (!hasParentId) {
			return (comms as ItemDetails["comments"]).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		}

		// We know we're dealing with TreeItems at this point
		const discussionComments = comms as DiscussionDetails["comments"];

		// Create a map to store children by their parent_id for quick lookups
		const childrenMap = new SvelteMap<
			DiscussionDetails["comments"][number]["parent_id"],
			DiscussionDetails["comments"]
		>();

		// Populate the map
		for (const comment of discussionComments) {
			if (!childrenMap.has(comment.parent_id)) {
				childrenMap.set(comment.parent_id, []);
			}
			childrenMap.get(comment.parent_id)?.push(comment);
		}

		// Sort children arrays by creation date
		for (const children of childrenMap.values()) {
			children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
		}

		// Recursively build the result array in the correct order
		const result: DiscussionDetails["comments"] = [];

		function traverseTree(parentId: DiscussionDetails["comments"][number]["parent_id"]) {
			const children = childrenMap.get(parentId) || [];

			for (const child of children) {
				result.push(child);
				traverseTree(child.id);
			}
		}

		// Start traversal from the root
		traverseTree(null);

		return result;
	}
</script>

<BottomCollapsible
	icon={MessagesSquare}
	label="Comments"
	secondaryLabel="{comments.length} comment{comments.length > 1 ? 's' : ''}"
>
	{#each sortComments(comments) as comment, i (comment.id)}
		{@const isAnswer =
			"parent_id" in comment && comment.parent_id ? comment.parent_id !== itemId : false}
		{#if !isAnswer && i > 0}
			<Separator class="my-2 h-1" />
		{/if}
		<div class={[isAnswer && "ml-4 border-l-4 pl-2"]}>
			<!-- Author -->
			<div
				class="inline-flex w-full flex-col gap-1 border-b px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
			>
				{#if comment.user}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={comment.user.html_url} class="group inline-flex items-center">
						<Avatar.Root class="mr-2 size-5">
							<Avatar.Image
								src={comment.user.avatar_url}
								alt={comment.user.login}
								class="group-hover:opacity-75"
							/>
							<Avatar.Fallback>
								{comment.user.login.charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
						<span class="font-semibold group-hover:underline">{comment.user.login}</span>
					</a>
					<span class="mx-1 hidden text-muted-foreground xs:block">•</span>
				{/if}
				<span class="text-muted-foreground">
					{dateTimeFormatter.format(new Date(comment.created_at))}
				</span>
			</div>
			<!-- Body -->
			<div class="p-4">
				<MarkdownRenderer
					markdown={comment.body || "_Empty comment_"}
					parseRawHtml
					class="max-w-none"
					additionalPlugins={[
						{
							remarkPlugin: [
								remarkGitHub,
								{ repository: `${currentRepo.owner}/${currentRepo.name}` }
							]
						},
						{ remarkPlugin: remarkGemoji },
						shikiPlugin
					]}
				>
					{#snippet a(props)}
						<LinkRenderer attributes={props} />
					{/snippet}
				</MarkdownRenderer>
				<Reactions reactions={comment.reactions} reactionItemUrl={comment.html_url} class="mt-4" />
			</div>
		</div>
	{/each}
</BottomCollapsible>
