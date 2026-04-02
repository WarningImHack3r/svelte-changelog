<script lang="ts">
	import { resolve } from "$app/paths";
	import { ArrowUpRight } from "@lucide/svelte";
	import remarkGemoji from "remark-gemoji";
	import remarkGitHub from "remark-github";
	import { siteName } from "$lib/properties";
	import type { LinkedItem } from "$lib/server/github-api";
	import type { JSONCompatible } from "$lib/types";
	import * as Accordion from "$lib/components/ui/accordion";
	import * as Avatar from "$lib/components/ui/avatar";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import Reactions from "$lib/components/Reactions.svelte";
	import { dateTimeFormatter } from "./formatters";
	import { shikiPlugin } from "./syntax-highlighting";

	type Props = {
		entities: JSONCompatible<LinkedItem>[];
		currentRepo: { owner: string; name: string };
	};

	let { entities, currentRepo }: Props = $props();
</script>

<Accordion.Root type="single" class="mb-12">
	{#each entities as entity (entity.number)}
		<div class="flex items-start gap-4">
			<Accordion.Item value={`${entity.number}`} class="flex-1">
				<Accordion.Trigger
					class="group hover:no-underline [&>svg:last-child]:my-auto [&>svg:last-child]:shrink-0"
				>
					<div class="mr-2 flex w-full flex-col gap-4 xs:gap-2 md:flex-row md:justify-between">
						<div class="flex gap-4">
							<!-- Status -->
							<GHBadge
								type={entity.type}
								status={entity.state === "MERGED"
									? "merged"
									: entity.state === "OPEN"
										? "open"
										: entity.stateReason === "COMPLETED"
											? "solved"
											: "closed"}
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
					<div class="flex items-end-safe gap-8">
						<Reactions
							reactions={entity.reactions}
							reactionItemUrl={entity.html_url}
							class="mt-4"
						/>
						<div class="ms-auto flex shrink-0 items-center gap-2">
							<AnimatedButton
								variant="outline"
								href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
									pid: "issues", // not always correct but the redirect will take care of that
									org: entity.repository.owner,
									repo: entity.repository.name,
									id: `${entity.number}`
								})}
							>
								Visit in {siteName}
							</AnimatedButton>
							<AnimatedButton
								href={entity.html_url}
								target="_blank"
								variant="secondary"
								class="group"
							>
								Open
								{#if entity.repository.owner === currentRepo.owner && entity.repository.name === currentRepo.name}
									#{entity.number}
								{:else}
									{entity.repository.owner}/{entity.repository.name}#{entity.number}
								{/if}
								on GitHub
								<ArrowUpRight
									class="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
								/>
							</AnimatedButton>
						</div>
					</div>
				</Accordion.Content>
			</Accordion.Item>
			<!-- Buttons -->
			<div class="mt-3 hidden items-center gap-2 xs:flex">
				<AnimatedButton
					variant="outline"
					href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
						pid: "issues", // not always correct but the redirect will take care of that
						org: entity.repository.owner,
						repo: entity.repository.name,
						id: `${entity.number}`
					})}
				>
					Visit
				</AnimatedButton>
				<AnimatedButton
					variant="secondary"
					size="icon"
					href={entity.html_url}
					target="_blank"
					rel="external"
				>
					<img src="/github.svg" alt="GitHub" class="size-4 dark:invert" />
				</AnimatedButton>
			</div>
		</div>
	{/each}
</Accordion.Root>
