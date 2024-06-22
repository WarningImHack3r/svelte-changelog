<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { localStorageStore } from "$lib/localStorageStore";

	/**
	 * The name of the localStorage item to get the date from.
	 */
	export let storedDateItem: string;
	/**
	 * Whether to show the pulse animation.
	 */
	export let show = false;

	let shouldShowPulse = false;

	onMount(() => {
		if (!storedDateItem) return;
		const storedDateStore = localStorageStore(storedDateItem, "");
		const storedDate = get(storedDateStore).replace(/"/g, "");
		const lastVisitItem = localStorage.getItem("lastVisit");
		if (storedDate && lastVisitItem) {
			shouldShowPulse = new Date(storedDate) > new Date(lastVisitItem);
		}
	});
</script>

{#if show && shouldShowPulse}
	<div class="relative inline-flex">
		<slot />
		<span class="absolute right-0 top-0 -mr-0.5 -mt-0.5 flex size-2.5">
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
			/>
			<span class="inline-flex size-2.5 rounded-full bg-primary" />
		</span>
	</div>
{:else}
	<slot />
{/if}
