import WorkerUrl from "@pierre/diffs/worker/worker.js?worker&url";

export function workerFactory() {
	return new Worker(WorkerUrl, { type: "module" });
}
