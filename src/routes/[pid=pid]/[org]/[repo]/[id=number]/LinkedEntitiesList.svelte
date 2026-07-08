<script lang="ts">
	import { resolve } from "$app/paths";
	import GitHub from "@icons-pack/svelte-simple-icons/icons/SiGithub";
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
	import { dateTimeFormatter, externalEntityLink } from "./formatters";
	import { shikiPlugin } from "./syntax-highlighting";

	type Props = {
		entities: JSONCompatible<LinkedItem>[];
		currentRepo: { owner: string; name: string };
	};

	let { entities, currentRepo }: Props = $props();
</script>

<Accordion.Root type="single" class="mb-12">
	{#each entities as entity (entity.number)}
		<Accordion.Item value={`${entity.number}`} class="flex-1">
			<Accordion.Trigger
				class="group hover:no-underline [&>svg:last-child]:my-auto [&>svg:last-child]:shrink-0"
			>
				<div
					class="flex w-full flex-col gap-4 xs:gap-2 md:flex-row md:items-center md:justify-between"
				>
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
								{externalEntityLink(
									{ user: currentRepo.owner, repo: currentRepo.name },
									{ user: entity.repository.owner, repo: entity.repository.name },
									entity.number
								)}
							</span>
						</span>
					</div>
					<!-- Author & Date -->
					<div
						class="flex shrink-0 flex-col items-end gap-1 text-right text-sm text-muted-foreground xs:ml-auto xs:flex-row xs:items-center"
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
					<!-- Buttons -->
					<div class="hidden items-center ms-2 gap-2 md:flex">
						<AnimatedButton
							variant="outline"
							href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
								pid: "issues", // not always correct but the redirect will take care of that
								org: entity.repository.owner,
								repo: entity.repository.name,
								id: entity.number
							})}
							onclick={e => e.stopPropagation()}
						>
							Visit
						</AnimatedButton>
						<AnimatedButton
							variant="secondary"
							size="icon"
							href={entity.html_url}
							onclick={e => e.stopPropagation()}
							target="_blank"
							rel="external"
						>
							<GitHub title="GitHub" />
						</AnimatedButton>
					</div>
				</div>
			</Accordion.Trigger>
			<!-- Body -->
			<Accordion.Content class="mx-auto sm:w-10/12">
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
				<div class="mt-4 flex flex-wrap items-end-safe gap-x-8 gap-y-4">
					<Reactions reactions={entity.reactions} reactionItemUrl={entity.html_url} />
					<div class="ms-auto flex flex-wrap items-center gap-2">
						<AnimatedButton
							variant="outline"
							href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
								pid: "issues", // not always correct but the redirect will take care of that
								org: entity.repository.owner,
								repo: entity.repository.name,
								id: entity.number
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
							{externalEntityLink(
								{ user: currentRepo.owner, repo: currentRepo.name },
								{ user: entity.repository.owner, repo: entity.repository.name },
								entity.number
							)}
							on GitHub
							<ArrowUpRight
								class="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
							/>
						</AnimatedButton>
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
