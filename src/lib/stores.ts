import { getContext, setContext } from "svelte";
import { writable } from "svelte/store";
import type { Tab } from "./types";

const tabStateKey = Symbol("tabState");

export function initTabState() {
	const tabState = writable<Tab>("svelte");
	return setContext(tabStateKey, tabState);
}

export function getTabState() {
	return getContext<ReturnType<typeof initTabState>>(tabStateKey);
}
