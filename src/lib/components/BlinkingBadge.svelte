<script lang="ts">
	import { onMount, type Snippet } from "svelte";
	import { get } from "svelte/store";
	import { persisted } from "svelte-persisted-store";
	import { plainTextSerializer } from "$lib/stores";

	type Props = {
		/**
		 * The name of the localStorage item to get the date from.
		 */
		storedDateItem: string;
		/**
		 * Whether to show the pulse animation.
		 */
		show?: boolean;
		children?: Snippet;
	};

	let { storedDateItem, show = false, children }: Props = $props();

	let shouldShowPulse = $state(false);

	onMount(() => {
		if (!storedDateItem) return;
		const storedDateStore = persisted(storedDateItem, "", {
			serializer: plainTextSerializer
		});
		const storedDate = get(storedDateStore).replace(/"/g, "");
		const lastVisitItem = localStorage.getItem("lastVisit");
		if (storedDate && lastVisitItem) {
			shouldShowPulse = new Date(storedDate) > new Date(lastVisitItem);
		}
	});
</script>

{#if show && shouldShowPulse}
	<div class="relative inline-flex">
		{@render children?.()}
		<span class="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex size-2.5">
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
			></span>
			<span class="inline-flex size-2.5 rounded-full bg-primary"></span>
		</span>
	</div>
{:else}
	{@render children?.()}
{/if}
