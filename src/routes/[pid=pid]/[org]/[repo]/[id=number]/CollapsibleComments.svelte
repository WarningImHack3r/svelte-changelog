<script lang="ts">
	import { MessagesSquare } from "@lucide/svelte";
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import type { DiscussionDetails, ItemDetails } from "$lib/server/github-api";
	import type { JSONCompatible } from "$lib/types";
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
		comments:
			| JSONCompatible<ItemDetails["comments"]>
			| JSONCompatible<DiscussionDetails["comments"]>
			| null;
		chosenCommentUrl?: string;
		currentRepo: { owner: string; name: string };
	};

	let { itemId, comments, chosenCommentUrl, currentRepo }: Props = $props();
	let comms = $derived(comments ?? []);
	let hasValidatedAnswer = $derived(
		chosenCommentUrl && comms.some(comm => comm.html_url === chosenCommentUrl)
	);

	/**
	 * Sort comments for discussions so that they simply have to be indented
	 * if answers to properly look like threads of comments.
	 *
	 * @param comms the input comments
	 * @returns the sorted comments
	 */
	function sortComments(comms: NonNullable<Props["comments"]>): NonNullable<Props["comments"]> {
		/*
		 * Check if the array contains discussion items (with `parent_id`)
		 * We only need to check the first item since we know all items are of the same type
		 */
		const hasParentId = comms[0] && "parent_id" in comms[0];

		// If these are simple items, sort by date and return
		if (!hasParentId) {
			return (comms as JSONCompatible<ItemDetails["comments"]>).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		}

		// We know we're dealing with discussion items at this point
		type DiscussionComments = JSONCompatible<DiscussionDetails["comments"]>;
		type DiscussionComment = DiscussionComments[number];
		const discussionComments = comms as DiscussionComments;

		// Create a map to store children by their parent_id for quick lookups
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const childrenMap = new Map<DiscussionComment["parent_id"], DiscussionComments>();

		// Populate the map
		let answerId: DiscussionComment["id"] | undefined;
		for (const comment of discussionComments) {
			if (answerId === undefined && comment.html_url === chosenCommentUrl) {
				answerId = comment.id;
			}
			if (!childrenMap.has(comment.parent_id)) {
				childrenMap.set(comment.parent_id, []);
			}
			childrenMap.get(comment.parent_id)?.push(comment);
		}

		// Sort children arrays by creation date
		for (const children of childrenMap.values()) {
			children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
		}

		function appendCommentSubtree(
			out: DiscussionComments,
			comment: DiscussionComment,
			skipId?: DiscussionComment["id"]
		) {
			if (skipId !== undefined && comment.id === skipId) return;

			out.push(comment);
			traverseTree(out, comment.id, skipId);
		}

		function traverseTree(
			out: DiscussionComments,
			parentId: DiscussionComment["parent_id"],
			skipId?: DiscussionComment["id"]
		) {
			const children = childrenMap.get(parentId) ?? [];

			for (const child of children) {
				appendCommentSubtree(out, child, skipId);
			}
		}

		const prioritized: DiscussionComments = [];
		if (answerId !== undefined) {
			const answer = discussionComments.find(({ id }) => id === answerId);
			if (answer) {
				appendCommentSubtree(prioritized, answer);
			}
		}

		const rest: DiscussionComments = [];
		traverseTree(rest, null, answerId);

		return [...prioritized, ...rest];
	}
</script>

<BottomCollapsible
	icon={MessagesSquare}
	secondaryLabel="{comms.length} comment{comms.length > 1 ? 's' : ''}"
>
	{#snippet label()}
		Comments
		{#if hasValidatedAnswer}
			• <span class="text-base text-green-500">Answered</span>
		{/if}
	{/snippet}
	{#each sortComments(comms) as comment, i (comment.id)}
		{let isReply = $derived(
			"parent_id" in comment && comment.parent_id ? comment.parent_id !== itemId : false
		)}
		{let isValidatedAnswer = $derived(comment.html_url === chosenCommentUrl)}
		{#if !isReply && i > 0}
			<Separator class="my-2 h-1" />
		{/if}
		<div
			class={[
				isReply && "ml-4 border-l-4 pl-2",
				isValidatedAnswer && "bg-green-500/15 border-green-500 border rounded-md"
			]}
		>
			<!-- Author -->
			<div
				class={[
					"inline-flex w-full flex-col gap-1 border-b px-4 py-2 xs:flex-row xs:items-center xs:gap-0",
					isValidatedAnswer && "border-green-500"
				]}
			>
				{#if comment.user}
					<a href={comment.user.html_url} rel="external" class="group inline-flex items-center">
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
				{#if isValidatedAnswer}
					<span class="text-green-500 ms-1">• Answer</span>
				{/if}
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
