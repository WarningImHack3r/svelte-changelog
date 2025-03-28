<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import type { CategorizedPackage } from "$lib/server/package-discoverer";
	import { cn } from "$lib/utils";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import * as Card from "$lib/components/ui/card";

	type Props = {
		packageName?: string;
		allPackages?: (Omit<CategorizedPackage, "packages"> & {
			packages: Omit<
				CategorizedPackage["packages"][number],
				"dataFilter" | "metadataFromTag" | "changelogContentsReplacer"
			>[];
		})[];
		class?: ClassValue;
	};
	let { packageName = "", allPackages = [], class: className }: Props = $props();
	let id = $props.id();
</script>

<div class={cn("flex flex-col *:shadow-lg *:shadow-black", className)}>
	<Card.Root class="sticky bg-secondary">
		<Card.Header>
			<Card.Title>Packages</Card.Title>
		</Card.Header>
		<Card.Content>
			<ul>
				{#each allPackages as { category, packages }, index (category)}
					{#if index > 0}
						<Separator class="mt-3 mb-2 rounded-full bg-muted-foreground" />
					{/if}
					<li class="space-y-2">
						<h3 class="text-xl font-bold text-primary">{category.name}</h3>
						<ul class="space-y-2">
							{#each packages as { pkg } (pkg.name)}
								<li>
									<a href="/package/{pkg.name}" class="underline-offset-4 hover:underline">
										{pkg.name}
									</a>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
	<div
		class="-mt-2 flex items-center gap-2 rounded-b-xl border-x border-b bg-card px-4 pt-5 pb-2.5"
	>
		<Checkbox id="beta-releases-{id}" aria-labelledby="beta-releases-label-{id}" />
		<Label
			id="beta-releases-label-{id}"
			for="beta-releases-{id}"
			class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Show {packageName} prereleases
		</Label>
	</div>
</div>
