<script lang="ts">
	import type { ComponentType, Snippet } from "svelte";
	import type { Icon } from "lucide-svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	const key = "collapsible";

	type Props = {
		icon?: ComponentType<Icon> | null;
		label: string;
		secondaryLabel?: string | undefined;
		openByDefault?: boolean;
		children?: Snippet;
	};

	let {
		icon = null,
		label,
		secondaryLabel = undefined,
		openByDefault = false,
		children
	}: Props = $props();
</script>

<div class="rounded-xl border px-4">
	<Accordion.Root type="single" value={openByDefault ? key : undefined}>
		<Accordion.Item value={key} class="border-b-0">
			<Accordion.Trigger
				class="group hover:no-underline [&>svg:last-child]:flex-shrink-0 [&[data-state=open]>svg]:rotate-0 [&[data-state=open]>svg:last-child]:rotate-180"
			>
				{#if icon}
					{@const SvelteComponent = icon}
					<SvelteComponent class="mr-3 size-5 flex-shrink-0" />
				{/if}
				<div class="flex w-full flex-col items-start justify-between xs:flex-row xs:items-center">
					<span class="text-xl font-semibold">{label}</span>
					{#if secondaryLabel}
						<span class="mr-4 text-right text-muted-foreground xs:ml-auto">{secondaryLabel}</span>
					{/if}
				</div>
			</Accordion.Trigger>
			<Accordion.Content>
				{@render children?.()}
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</div>
