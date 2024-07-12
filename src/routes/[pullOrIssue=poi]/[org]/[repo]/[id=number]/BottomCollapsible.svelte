<script lang="ts">
	import type { ComponentType } from "svelte";
	import type { Icon } from "lucide-svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	export let icon: ComponentType<Icon> | null = null;
	export let label: string;
	export let secondaryLabel = "";
</script>

<div class="rounded-xl border px-4">
	<Accordion.Root>
		<Accordion.Item value="comments" class="border-b-0">
			<Accordion.Trigger
				class="group hover:no-underline [&[data-state=open]>svg:last-child]:rotate-180 [&[data-state=open]>svg]:rotate-0"
			>
				{#if icon}
					<svelte:component this={icon} class="mr-3 size-5" />
				{/if}
				<span class="text-xl font-semibold">{label}</span>
				<span class="ml-auto mr-4 text-muted-foreground">{secondaryLabel}</span>
			</Accordion.Trigger>
			<Accordion.Content>
				<slot />
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</div>
