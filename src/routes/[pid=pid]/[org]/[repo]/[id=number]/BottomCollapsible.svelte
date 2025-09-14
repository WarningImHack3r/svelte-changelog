<script lang="ts">
	import type { Snippet } from "svelte";
	import type { Icon } from "@lucide/svelte";
	import * as Accordion from "$lib/components/ui/accordion";

	type Props = {
		icon?: typeof Icon;
		label: string;
		secondaryLabel?: string | undefined;
		openByDefault?: boolean;
		children?: Snippet;
	};

	let {
		icon = undefined,
		label,
		secondaryLabel = undefined,
		openByDefault = false,
		children
	}: Props = $props();

	let id = $props.id();
</script>

<div class="rounded-md border bg-background px-4">
	<Accordion.Root type="single" value={openByDefault ? id : undefined}>
		<Accordion.Item value={id} class="border-b-0">
			<Accordion.Trigger
				class="group items-center gap-0 hover:no-underline [&>svg:last-child]:mb-1 [&>svg:last-child]:flex-shrink-0 [&[data-state=open]>svg]:rotate-0 [&[data-state=open]>svg:last-child]:rotate-180"
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
