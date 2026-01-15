<script lang="ts">
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import type { LinkedItem } from "$lib/server/github-cache";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Avatar from "$lib/components/ui/avatar";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import { dateTimeFormatter } from "./formatters";
	import { shikiPlugin } from "./syntax-highlighting";

	type Props = {
		entities: LinkedItem[];
		currentRepo: { owner: string; name: string };
	};

	let { entities, currentRepo }: Props = $props();
</script>

<Accordion.Root type="single" class="mb-12">
	{#each entities as entity (entity.number)}
		<Accordion.Item value={`${entity.number}`}>
			<Accordion.Trigger class="group hover:no-underline [&>svg:last-child]:shrink-0">
				<div class="mr-2 flex w-full flex-col gap-4 xs:gap-2 md:flex-row md:justify-between">
					<div class="flex gap-4">
						<!-- Status -->
						<GHBadge
							type={entity.type}
							status={entity.state === "MERGED"
								? "merged"
								: entity.state === "CLOSED"
									? entity.stateReason === "COMPLETED"
										? "solved"
										: "closed"
									: "open"}
							mode="minimal"
							class="shrink-0"
						/>
						<!-- Title -->
						<span class="text-left group-hover:*:underline">
							<MarkdownRenderer
								markdown={entity.title}
								inline
								class="leading-normal text-foreground"
							/>
							<span class="ml-1 font-light text-muted-foreground">
								{#if entity.repository.owner === currentRepo.owner && entity.repository.name === currentRepo.name}
									#{entity.number}
								{:else}
									{entity.repository.owner}/{entity.repository.name}#{entity.number}
								{/if}
							</span>
						</span>
					</div>
					<!-- Author & Date -->
					<div
						class="mr-4 flex shrink-0 flex-col items-end gap-1 text-right text-sm text-muted-foreground xs:ml-auto xs:flex-row xs:items-center"
					>
						{#if "author" in entity}
							<div class="flex items-center gap-2">
								<Avatar.Root class="size-6">
									<Avatar.Image src={entity.author?.avatarUrl} alt={entity.author?.login} />
									<Avatar.Fallback>
										{entity.author?.login.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<span class="font-semibold">{entity.author?.login}</span>
							</div>
							<span class="hidden xs:block">•</span>
						{/if}
						{#if "createdAt" in entity}
							<span>{dateTimeFormatter.format(new Date(entity.createdAt))}</span>
						{/if}
					</div>
				</div>
			</Accordion.Trigger>
			<!-- Body -->
			<Accordion.Content class="mx-auto sm:w-3/4">
				<MarkdownRenderer
					markdown={entity.body || "_No description provided_"}
					parseRawHtml
					class="max-w-full text-base"
					additionalPlugins={[
						{
							remarkPlugin: [
								remarkGitHub,
								{ repository: `${entity.repository.owner}/${entity.repository.name}` }
							]
						},
						{ remarkPlugin: remarkGemoji },
						shikiPlugin
					]}
				/>
				<Reactions reactions={entity.reactions} reactionItemUrl={entity.html_url} class="mt-4" />
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
