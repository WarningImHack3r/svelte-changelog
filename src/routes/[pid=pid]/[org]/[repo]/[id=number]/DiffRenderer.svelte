<script lang="ts" module>
	import { browser } from "$app/environment";
	import { type FileDiffMetadata, parsePatchFiles as pierreParsePatchFiles } from "@pierre/diffs";
	import {
		type WorkerInitializationRenderOptions,
		getOrCreateWorkerPoolSingleton
	} from "@pierre/diffs/worker";
	import type { PullRequestDetails } from "$lib/server/github-cache";
	import { workerFactory } from "./workers";

	function getWorker(options: WorkerInitializationRenderOptions) {
		if (!browser) return undefined; // worker is browser-only
		return getOrCreateWorkerPoolSingleton({
			poolOptions: {
				workerFactory
				// poolSize defaults to 8. More workers = more parallelism but
				// also more memory. Too many can actually slow things down.
				// poolSize: 8,
			},
			highlighterOptions: options
		});
	}

	/**
	 * Parses the patch file(s) from a file API entry.
	 *
	 * @param file the single file from the `/files` GitHub API endpoint
	 * @returns an array of diffs metadata to provide to this very component
	 */
	export function parsePatchFiles(file: PullRequestDetails["files"][number]): FileDiffMetadata[] {
		// all the additional processing done here is to bring the otherwise native
		// formatting features (or make them working at all) as they were originally
		// designed for large native GitHub .patch files
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
	import { MediaQuery } from "svelte/reactivity";
	import type { ResolvedPathname } from "$app/types";
	import {
		FileDiff,
		type FileDiffOptions,
		type FileDiffRenderProps,
		type SupportedLanguages
	} from "@pierre/diffs";
	import { mode } from "mode-watcher";
	import posthog from "posthog-js";

	type Props = Omit<FileDiffRenderProps<T>, "containerWrapper" | "fileContainer"> & {
		route: ResolvedPathname;
		options: FileDiffOptions<T>;
		langs?: (SupportedLanguages | (string & {}))[];
	};

	let { route, options, langs, ...props }: Props = $props();
	let id = $props.id();

	let mobile = new MediaQuery("width < 800px");

	let fileDiff = $derived(
		new FileDiff(
			{
				diffStyle: untrack(() => mobile.current) ? "unified" : undefined,
				themeType: untrack(() => mode.current) ?? "system",
				unsafeCSS: /* css */ ` /* unsafe CSS injection cause shadow DOM + not overridable property otherwise */
    			    [data-diffs-header] {
    					position: sticky;
    					top: 3.5rem; /* won't work with banner and is hardcoded but I can't really do much better */
    					z-index: 30;

                        & [data-header-content] [data-title] {
                            direction: initial; /* for some reason, the default direction is \`rtl\`, putting the leading dots at the end (\`.github/file.txt\` becomes \`github/file.txt.\`) */
                        }
    				}
    			`,
				disableErrorHandling: true,
				...options
			},
			getWorker({ ...options, langs: langs as SupportedLanguages[] })
		)
	);

	// Initial rendering and cleanup handling
	$effect(() => {
		try {
			fileDiff.render({
				containerWrapper: document.getElementById(`diff-${id}`) ?? undefined,
				...props
			});
		} catch (e) {
			posthog.captureException(e, {
				fileName: props.fileDiff?.name ?? "unknown",
				pr: route
			});
			const el = document.getElementById(`diff-${id}`);
			if (el)
				el.innerText = `\nFailed to render the diff for "${props.fileDiff?.name ?? "<unknown>"}". Please try again. This issue has been reported.\n\n`;
		}
	});

	// Mobile diff type change
	$effect(() => {
		fileDiff.setOptions({ ...fileDiff.options, diffStyle: mobile.current ? "unified" : undefined });
		try {
			fileDiff.rerender();
		} catch (e) {
			posthog.captureException(e, {
				fileName: props.fileDiff?.name ?? "unknown",
				pr: route
			});
			const el = document.getElementById(`diff-${id}`);
			if (el)
				el.innerText = `\nFailed to render the diff for "${props.fileDiff?.name ?? "<unknown>"}". Please try again. This issue has been reported.\n\n`;
		}
	});

	// Theme change
	$effect(() => fileDiff.setThemeType(mode.current ?? "system"));

	// Unmount cleanup
	$effect(() => () => fileDiff.cleanUp());
</script>

<div
	id="diff-{id}"
	class="contents"
	style:--diffs-font-family="var(--font-mono)"
	style:--diffs-header-font-family="var(--font-sans)"
></div>
