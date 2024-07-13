<script lang="ts">
	import type { ComponentType } from "svelte";
	import type { Icon } from "lucide-svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	export let icon: ComponentType<Icon> | null = null;
	export let label: string;
	export let secondaryLabel: string | undefined = undefined;
	export let openByDefault = false;
</script>

<div class="rounded-xl border px-4">
	<Accordion.Root value={openByDefault ? "comments" : undefined}>
		<Accordion.Item value="comments" class="border-b-0">
			<Accordion.Trigger
				class="group hover:no-underline [&>svg:last-child]:flex-shrink-0 [&[data-state=open]>svg:last-child]:rotate-180 [&[data-state=open]>svg]:rotate-0"
			>
				{#if icon}
					<svelte:component this={icon} class="mr-3 size-5 flex-shrink-0" />
				{/if}
				<div class="flex w-full flex-col items-start justify-between xs:flex-row xs:items-center">
					<span class="text-xl font-semibold">{label}</span>
					{#if secondaryLabel}
						<span class="mr-4 text-right text-muted-foreground xs:ml-auto">{secondaryLabel}</span>
					{/if}
				</div>
			</Accordion.Trigger>
			<Accordion.Content>
				<slot />
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</div>
