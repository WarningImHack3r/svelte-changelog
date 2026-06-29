<script lang="ts">
	import { untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";
	import { scrollY } from "svelte/reactivity/window";
	import { browser } from "$app/env";
	import { replaceState } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { navigating, page } from "$app/state";
	import { ArrowUpRight, ChevronLeft, CircleAlert, Lock, Tag } from "@lucide/svelte";
	import { pidFormatter } from "$lib/strings";
	import type { PID } from "$lib/types";
	import * as Alert from "$lib/components/ui/alert";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import AnimatedButton from "$lib/components/AnimatedButton.svelte";
	import GHBadge from "$lib/components/GHBadge.svelte";
	import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
	import TopBanner from "$lib/components/TopBanner.svelte";
	import CollapsibleComments from "./CollapsibleComments.svelte";
	import CollapsibleCommits from "./CollapsibleCommits.svelte";
	import CollapsibleFiles from "./CollapsibleFiles.svelte";
	import DetailsBody from "./DetailsBody.svelte";
	import InfoBanner, { badgeText } from "./InfoBanner.svelte";
	import LinkedEntitiesList from "./LinkedEntitiesList.svelte";
	import { dateTimeFormatter } from "./formatters";

	let { data } = $props();

	let info = $derived(data.item.info);
	let metadata = $derived(data.itemMetadata);
	let comments = $derived("comments" in data.item ? data.item.comments : []);
	let commits = $derived("commits" in data.item ? data.item.commits : []);
	let files = $derived("files" in data.item ? data.item.files : []);
	let linkedEntities = $derived(
		"linkedPrs" in data.item
			? data.item.linkedPrs
			: "linkedIssues" in data.item
				? data.item.linkedIssues
				: []
	);

	// Hash management
	let wantsReducedMotion = new MediaQuery("prefers-reduced-motion: reduce");
	$effect(() => {
		if (!page.url.hash || navigating.to || untrack(() => scrollY.current ?? 0) > 0) return;

		const element = document.getElementById(page.url.hash.slice(1));
		if (!element) {
			// remove unwanted hashes, like those from GitHub if coming from redirection
			replaceState("", {});
			return;
		}
		element.scrollIntoView({ behavior: wantsReducedMotion.current ? undefined : "smooth" });
	});

	/**
	 * Returns the PID of the linked entity from the input one.
	 *
	 * @param pid the input PID
	 * @returns the PID of its linked entity
	 */
	export function getLinkedEntityPID(pid: PID): PID {
		switch (pid) {
			case "pull":
				return "issues";
			case "issues":
				return "pull";
		}
		return pid;
	}

	/**
	 * Returns the previous page to go back to
	 */
	function getPreviousPath() {
		if (!browser || !document.referrer) return resolve("/");
		return new URL(document.referrer).pathname;
	}
</script>

<!-- Dev banner -->
{#if data.devOnlyRepo}
	<TopBanner
		icon={CircleAlert}
		title="Dev-only repo"
		markdown="This repository is only visible in dev mode for testing purposes, it will be forbidden in production as it's not listed in the site's repositories."
		class="mb-8 border-red-500 bg-red-400/10 text-red-500 prose-a:text-red-500! selection:bg-red-500 selection:text-white"
	/>
{/if}

<!-- Title -->
<h2 class="group mb-8 scroll-m-20 border-b pb-2 text-2xl font-semibold xs:text-3xl">
	<a href={info.html_url} rel="external">
		<MarkdownRenderer
			markdown={info.title}
			inline
			class="prose-xl text-2xl text-foreground group-hover:underline xs:prose-2xl xs:text-3xl"
		/>
		<span class="ml-1 font-light text-muted-foreground group-hover:underline">#{info.number}</span>
	</a>
</h2>

<!-- Linked issues/PRs -->
{#if linkedEntities.length}
	<h3 class="font-display text-2xl font-semibold tracking-tight">
		{pidFormatter.toLinkedEntity(metadata.type, linkedEntities.length > 1)}
	</h3>
	<LinkedEntitiesList
		entities={linkedEntities}
		currentRepo={{
			owner: metadata.org,
			name: metadata.repo
		}}
	/>
{/if}

<!-- Info header -->
{let mobile = new MediaQuery("width < 768px")}
<div class="flex items-baseline">
	<h3 class="font-display text-2xl font-semibold tracking-tight">
		{pidFormatter.toHumanReadable(metadata.type)}
	</h3>
	{#if info.locked}
		<div
			class="ml-auto flex items-center rounded-full bg-neutral-500/70 px-2 py-2 text-white xs:px-4 dark:bg-neutral-500/50"
		>
			<Lock class="size-5" />
			<span class="ml-2 hidden font-semibold xs:inline">Locked</span>
		</div>
	{/if}
	{#key info}
		<Tooltip.Provider delayDuration={300} disabled={mobile.current}>
			<Tooltip.Root>
				<Tooltip.Trigger
					class={{ "ml-auto": !info.locked, "ml-3 xs:ml-4": info.locked, "cursor-default": true }}
				>
					<GHBadge
						type={metadata.type}
						status={info.state === "closed"
							? "merged" in info
								? info.merged
									? "merged"
									: "closed"
								: "state_reason" in info && info.state_reason === "completed"
									? "solved"
									: "closed"
							: "draft" in info && info.draft
								? "draft"
								: "open"}
					/>
				</Tooltip.Trigger>
				<Tooltip.Content
					class="border bg-popover text-popover-foreground text-sm"
					arrowClasses="bg-popover border-b border-r"
				>
					{@render badgeText(info)}
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/key}
</div>
<InfoBanner {info} />

<!-- Body -->
<div class="mt-4 flex flex-col gap-4">
	<!-- Info -->
	<div class="rounded-md border bg-background">
		<!-- Author -->
		<div
			class="inline-flex w-full flex-col gap-1 border-b bg-muted/60 px-4 py-2 xs:flex-row xs:items-center xs:gap-0"
		>
			{#if info.user}
				<a href={info.user.html_url} rel="external" class="group inline-flex items-center">
					<Avatar.Root class="mr-2 size-5">
						<Avatar.Image
							src={info.user.avatar_url}
							alt={info.user.login}
							class="group-hover:opacity-75"
						/>
						<Avatar.Fallback>
							{info.user.login.charAt(0).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>
					<span class="font-semibold group-hover:underline">{info.user.login}</span>
				</a>
				<span class="mx-1 hidden text-muted-foreground xs:block">•</span>
			{/if}
			<span class="text-muted-foreground">
				{dateTimeFormatter.format(new Date(info.created_at))}
			</span>
		</div>
		<!-- Body -->
		<DetailsBody
			body={info.body}
			currentRepo={{
				owner: metadata.org,
				name: metadata.repo
			}}
			renderSlug={metadata.type === "discussions"}
			reactions={"reactions" in info ? info.reactions : undefined}
			reactionItemUrl={info.html_url}
			class="bg-muted/30 p-4"
		/>
	</div>
	<!-- Merged on {tag} banner -->
	{#await data.mergedTagName then mergedTag}
		{#if mergedTag}
			{let [tagName, tagVersion] = $derived(mergedTag)}
			<div class="bg-background">
				<Alert.Root
					class="rounded-md selection:bg-green-500 dark:selection:bg-green-700 selection:text-white border-green-500 bg-green-400/10"
				>
					<Tag class="size-4" />
					<Alert.Description class="inline text-foreground">
						This pull request was released in
						<Button
							variant="link"
							href={resolve(`/package/[...package]#${tagVersion}`, {
								package: tagName
							})}
							class="h-auto p-0 text-green-500"
						>
							{tagName}
							{tagVersion}
						</Button>
					</Alert.Description>
				</Alert.Root>
			</div>
		{/if}
	{/await}
	<!-- Bottom block -->
	<div class="mt-8 space-y-4">
		<!-- Comments -->
		{#if comments.length}
			<CollapsibleComments
				itemId={info.id}
				{comments}
				chosenCommentUrl={"answer_html_url" in info
					? (info.answer_html_url ?? undefined)
					: undefined}
				currentRepo={{
					owner: metadata.org,
					name: metadata.repo
				}}
			/>
		{/if}
		<!-- Commits -->
		{#if metadata.type === "pull"}
			<CollapsibleCommits
				prCreationDate={new Date(info.created_at)}
				prClosingDate={"merged" in info && info.closed_at ? new Date(info.closed_at) : null}
				merged={"merged" in info ? info.merged : false}
				{commits}
				currentRepo={{
					owner: metadata.org,
					name: metadata.repo
				}}
			/>
		{/if}
		<!-- Files -->
		{#if metadata.type === "pull"}
			<CollapsibleFiles
				route={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
					pid: metadata.type,
					org: metadata.org,
					repo: metadata.repo,
					id: `${info.number}`
				})}
				{files}
			/>
		{/if}
	</div>
</div>

<!-- Bottom links -->
<div class="mt-16 flex w-full flex-col-reverse justify-between gap-8 md:flex-row md:items-center">
	<Button href={getPreviousPath()} variant="link" class="group mr-auto gap-0 md:mr-0">
		<ChevronLeft class="mr-1 size-4 transition-transform duration-300 group-hover:-translate-x-1" />
		Back
		{#if getPreviousPath() === resolve("/")}
			to homepage
		{/if}
	</Button>
	<div class="flex flex-col-reverse items-end gap-4 md:flex-row md:items-center">
		{#if linkedEntities.length}
			<div class="flex flex-wrap justify-end gap-4">
				{#each linkedEntities as entity (entity.number)}
					<AnimatedButton
						href={resolve("/[pid=pid]/[org]/[repo]/[id=number]", {
							pid: getLinkedEntityPID(metadata.type),
							org: entity.repository.owner,
							repo: entity.repository.name,
							id: `${entity.number}`
						})}
						variant="secondary"
					>
						Open {pidFormatter.toHumanReadable(getLinkedEntityPID(metadata.type)).toLowerCase()}
						{#if entity.repository.owner === metadata.org && entity.repository.name === metadata.repo}
							#{entity.number}
						{:else}
							{entity.repository.owner}/{entity.repository.name}#{entity.number}
						{/if}
					</AnimatedButton>
				{/each}
			</div>
		{/if}
		<AnimatedButton href={info.html_url} target="_blank" class="group gap-0 dark:text-black">
			Open {pidFormatter.toHumanReadable(metadata.type).toLowerCase()} on GitHub
			<ArrowUpRight
				class="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
			/>
		</AnimatedButton>
	</div>
</div>

<style>
	:global(html.dark .shiki),
	:global(html.dark .shiki span) {
		color: var(--shiki-dark) !important;
		font-style: var(--shiki-dark-font-style) !important;
		font-weight: var(--shiki-dark-font-weight) !important;
		text-decoration: var(--shiki-dark-text-decoration) !important;
	}

	:global(html.dark .shiki),
	:global(html.dark .shiki .line:not(.diff) span) {
		background-color: var(--shiki-dark-bg) !important;
	}

	:global {
		.shiki {
			position: relative;

			/* Line numbers, credit to https://github.com/shikijs/shiki/issues/3#issuecomment-830564854 */
			code {
				counter-reset: step;
				counter-increment: step 0;

				.line::before {
					content: counter(step);
					counter-increment: step;
					width: 1rem;
					margin-right: 1.5rem;
					display: inline-block;
					text-align: right;
					white-space: nowrap;
					color: color-mix(in oklab, var(--color-muted-foreground) 70%, transparent);
				}

				/* Diff marks */
				.diff {
					display: inline-block;
					transition: background-color 0.5s;

					&::after {
						content: "";
						position: absolute;
						left: 0;
						width: 100%;
						height: 1lh;
					}

					&.add {
						&::after {
							background-color: color-mix(
								in oklab,
								var(--color-green-500) 15%,
								transparent
							) !important;
						}

						span:first-child::before {
							content: "+";
							color: var(--color-green-500);
						}
					}

					&.remove {
						&::after {
							background-color: color-mix(
								in oklab,
								var(--color-destructive) 15%,
								transparent
							) !important;
						}

						span {
							opacity: 0.7;
						}

						span:first-child::before {
							content: "-";
							font-weight: bold;
							color: var(--color-destructive);
						}
					}

					span:first-child::before {
						position: absolute;
						left: 2.5rem;
					}
				}
			}

			/* Language tag banner */
			&:is(pre[data-language]) {
				padding-top: 3rem;
				border-radius: var(--radius-xl);
				border: 1px var(--tw-border-style) var(--color-border);

				&::before,
				&::after {
					text-transform: lowercase;
					font-size: var(--text-xs);
					position: absolute;
					padding: 0.6rem 1rem;
				}

				&::before {
					content: attr(data-language);
					inset: 0 0 auto 0;
					height: 2.5rem;
					background-color: var(--color-secondary);
					border-bottom: 1px var(--tw-border-style) var(--color-border);
				}

				&[data-detected="true"]::after {
					content: "(auto-detected)";
					inset: 0 0 auto auto;
					color: var(--color-muted-foreground);
				}
			}
		}
	}
</style>
