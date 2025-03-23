<script lang="ts">
	import { Separator } from "$lib/components/ui/separator";
	import { ChevronRight } from "@lucide/svelte";

	let { data } = $props();
</script>

<div class="container py-8">
	<ul class="space-y-8">
		{#each data.packages as { category, packages } (category)}
			<li>
				<h3 class="text-2xl font-bold text-primary">{category}</h3>
				<ul class="mt-2">
					{#each packages as { name, repoName }, index (name)}
						{#if index > 0}
							<Separator class="mx-auto my-1 w-[95%]" />
						{/if}
						<li>
							<a
								href="/package/{name}"
								class="group flex items-center rounded-lg px-4 py-3 transition-colors hover:bg-neutral-800"
							>
								<div class="flex flex-col">
									<h4 class="font-medium">{name}</h4>
									{#if category === "Other"}
										<span class="text-muted-foreground">
											sveltejs/{repoName}
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
</div>
