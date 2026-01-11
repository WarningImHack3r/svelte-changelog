<script lang="ts" module>
	import {
		type FileDiffMetadata,
		parsePatchFiles as pierreParsePatchFiles,
		preloadHighlighter as pierrePreloadHighlighter
	} from "@pierre/diffs";
	import type { PullRequestDetails } from "$lib/server/github-cache";

	type BaseHighlighterOptions = Parameters<typeof pierrePreloadHighlighter>[0];
	type HighlighterOptions = Omit<BaseHighlighterOptions, "langs"> & {
		langs: (string | BaseHighlighterOptions["langs"][number])[];
	};

	export function preloadHighlighter(options: HighlighterOptions) {
		return pierrePreloadHighlighter(options as BaseHighlighterOptions);
	}

	/**
	 * Parses the patch file(s) from a file API entry.
	 *
	 * @param file the single file from the `/files` GitHub API endpoint
	 * @returns an array of diffs metadata to provide to this very component
	 */
	export function parsePatchFiles(file: PullRequestDetails["files"][number]): FileDiffMetadata[] {
		const aFile = `--- ${file.status === "added" ? "/dev/null" : file.filename}`;
		const bFile = `+++ ${file.status === "removed" ? "/dev/null" : file.filename}`;
		return file.patch
			? pierreParsePatchFiles(`${aFile}\n${bFile}\n${file.patch}`, `diff-${file.filename}`).flatMap(
					p =>
						p.files.map(patchFile => {
							let newType = patchFile.type;
							switch (file.status) {
								case "added":
								case "copied":
									newType = "new";
									break;
								case "removed":
									newType = "deleted";
									break;
								case "renamed":
									newType = file.changes ? "rename-changed" : "rename-pure";
									break;
								case "changed":
								case "modified":
								case "unchanged":
									// stay "changed"
									break;
							}
							return { ...patchFile, type: newType };
						})
				)
			: [];
	}
</script>

<script lang="ts" generics="T">
	import { untrack } from "svelte";
	import { FileDiff, type FileDiffOptions, type FileDiffRenderProps } from "@pierre/diffs";
	import { mode } from "mode-watcher";

	type Props = Omit<FileDiffRenderProps<T>, "containerWrapper" | "fileContainer"> & {
		options: FileDiffOptions<T>;
	};

	let { options, ...props }: Props = $props();
	let id = $props.id();

	let fileDiff = $derived(
		new FileDiff({
			themeType: untrack(() => mode.current) ?? "system",
			unsafeCSS: /* css */ ` /* unsafe CSS injection cause shadow DOM + not overridable property otherwise */
			    [data-diffs-header] {
					position: sticky;
					top: 3.5rem; /* won't work with banner and is hardcoded but I can't really do much better */
					z-index: 30;
				}

                [data-header-content] [data-title] {
                    direction: initial; /* for some reason, the default direction is \`rtl\`, putting the leading dots at the end (\`.github/file.txt\` becomes \`github/file.txt.\`) */
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
