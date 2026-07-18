<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import type { ResolvedPathname } from "$app/types";
	import { NavigationMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	type Props = {
		items?: {
			name: string;
			href: ResolvedPathname;
		}[];
		class?: ClassValue;
	};

	let { items = [], class: className }: Props = $props();
</script>

<NavigationMenu.Root class={cn("relative", className)}>
	<NavigationMenu.List class="group flex list-none items-center gap-1 p-1">
		{#each items as menuItem (menuItem.name)}
			<NavigationMenu.Item>
				<NavigationMenu.Link
					class="group inline-flex h-8 w-max items-center justify-center rounded-[7px] bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-white hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-white data-[state=open]:shadow-xs dark:hover:bg-muted dark:data-[state=open]:bg-muted"
					href={menuItem.href}
				>
					{menuItem.name}
				</NavigationMenu.Link>
			</NavigationMenu.Item>
		{/each}
	</NavigationMenu.List>
</NavigationMenu.Root>
