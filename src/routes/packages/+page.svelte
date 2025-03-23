<script lang="ts">
	import { ChevronRight } from "@lucide/svelte";
	import { Separator } from "$lib/components/ui/separator";

	let { data } = $props();
</script>

<ul class="space-y-8">
	{#each data.categorizedPackages as { category, packages } (category)}
		<li>
			<h3 class="text-2xl font-bold text-primary">{category.name}</h3>
			<ul class="mt-2">
				{#each packages as { owner, repoName, packageName }, index (packageName)}
					{#if index > 0}
						<Separator class="mx-auto my-1 w-[95%]" />
					{/if}
					<li>
						<a
							href="/package/{packageName}"
							class="group flex items-center rounded-lg px-4 py-3 transition-colors hover:bg-neutral-800"
						>
							<div class="flex flex-col">
								<h4 class="font-medium">{packageName}</h4>
								{#if category.slug === "others"}
									<span class="text-muted-foreground">
										{owner}/{repoName}
									</span>
								{/if}
							</div>
							<ChevronRight class="mr-1 ml-auto transition-transform group-hover:translate-x-1" />
						</a>
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>
