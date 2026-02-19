<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import type { ResolvedPathname } from "$app/types";
	import { ChevronDown } from "@lucide/svelte";
	import { NavigationMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	type Props = {
		items?: ({
			name: string;
		} & (
			| {
					href: ResolvedPathname;
			  }
			| {
					dropdownItems: {
						title: string;
						href: ResolvedPathname;
						description?: string;
					}[];
					moreHref?: ResolvedPathname;
			  }
		))[];
		class?: ClassValue;
	};

	let { items = [], class: className }: Props = $props();
</script>

{#snippet listItem({
	title,
	description,
	href,
	itemClass
}: {
	title: string;
	href: ResolvedPathname;
	description?: string;
	itemClass?: ClassValue;
})}
	<li>
		<NavigationMenu.Link
			class={cn(
				"block space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors select-none hover:bg-muted hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground",
				itemClass
			)}
			{href}
		>
			<div class="text-sm leading-none font-medium">{title}</div>
			{#if description}
				<p class="line-clamp-2 text-sm leading-snug text-muted-foreground">
					{description}
				</p>
			{/if}
		</NavigationMenu.Link>
	</li>
{/snippet}

<NavigationMenu.Root class={cn("relative", className)}>
	<NavigationMenu.List class="group flex list-none items-center p-1">
		{#each items as menuItem (menuItem.name)}
			<NavigationMenu.Item>
				{#if "href" in menuItem}
					<NavigationMenu.Link
						class="group inline-flex h-8 w-max items-center justify-center rounded-[7px] bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-white hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-white data-[state=open]:shadow-xs dark:hover:bg-muted dark:data-[state=open]:bg-muted"
						href={menuItem.href}
					>
						{menuItem.name}
					</NavigationMenu.Link>
				{:else}
					<NavigationMenu.Trigger
						class="group inline-flex h-8 w-max items-center justify-center rounded-[7px] bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-white hover:text-accent-foreground focus-visible:bg-muted focus-visible:text-accent-foreground focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-white data-[state=open]:shadow-xs dark:hover:bg-muted dark:data-[state=open]:bg-muted"
					>
						{menuItem.name}
						<ChevronDown
							class="relative top-px ml-1 size-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
							aria-hidden="true"
						/>
					</NavigationMenu.Trigger>
					<NavigationMenu.Content
						class="absolute top-0 left-0 w-full duration-200 data-[motion=from-end]:animate-in data-[motion=from-end]:slide-in-from-right data-[motion=from-start]:animate-in data-[motion=from-start]:slide-in-from-left data-[motion=to-end]:animate-out data-[motion=to-end]:slide-out-to-right data-[motion=to-start]:animate-out data-[motion=to-start]:slide-out-to-left sm:w-auto"
					>
						<ul class="grid gap-3 p-3 sm:w-100 sm:p-6 md:w-125 md:grid-cols-3 lg:w-150">
							{#each menuItem.dropdownItems as component (component.title)}
								{@render listItem(component)}
							{/each}
							{#if menuItem.moreHref}
								{@render listItem({
									title: "See more",
									href: menuItem.moreHref,
									className:
										"text-primary underline-offset-4 *:first:after:ml-2 *:first:after:inline-block *:first:after:transition-transform *:first:after:duration-200 *:first:after:content-['→'] hover:text-primary hover:underline hover:*:first:after:translate-x-1"
								})}
							{/if}
						</ul>
					</NavigationMenu.Content>
				{/if}
			</NavigationMenu.Item>
		{/each}
		<NavigationMenu.Indicator
			class="top-full z-10 flex h-2.5 items-end justify-center overflow-clip opacity-100 duration-200 data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in"
		>
			<div class="relative top-[70%] size-2.5 rotate-45 rounded-tl-[2px] bg-border"></div>
		</NavigationMenu.Indicator>
	</NavigationMenu.List>
	<div class="absolute top-full left-0 flex w-max perspective-[2000px]">
		<NavigationMenu.Viewport
			class="relative mt-2.5 h-(--bits-navigation-menu-viewport-height) w-full origin-[top_center] overflow-x-clip rounded-md border bg-background text-popover-foreground shadow-lg transition-[width,height] duration-200 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:zoom-in-90 sm:w-(--bits-navigation-menu-viewport-width)"
		/>
	</div>
</NavigationMenu.Root>
