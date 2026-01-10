<script lang="ts" generics="T">
	import { untrack } from "svelte";
	import { FileDiff, type FileDiffOptions, type FileDiffRenderProps } from "@pierre/diffs";
	import { mode } from "mode-watcher";

	type Props = Omit<FileDiffRenderProps<T>, "containerWrapper"> & {
		options: FileDiffOptions<T>;
	};

	let { options, ...props }: Props = $props();
	let id = $props.id();

	let fileDiff = $derived(
		new FileDiff({
			themeType: untrack(() => mode.current) ?? "system",
			unsafeCSS: /* css */ `
                [data-header-content] [data-title] {
                    direction: initial;
                }
			`,
			...options
		})
	);

	// Initial rendering and cleanup handling
	$effect(() => {
		fileDiff.render({
			containerWrapper: document.getElementById(`diff-${id}`) ?? undefined,
			...props
		});

		return () => fileDiff.cleanUp();
	});

	// Theme change
	$effect(() => fileDiff.setThemeType(mode.current ?? "system"));
</script>

<div id="diff-{id}" class="contents"></div>

<style>
	div {
		--diffs-font-family: var(--font-mono);
		--diffs-header-font-family: var(--font-sans);
		--diffs-dark-bg: white !important;
	}
</style>
