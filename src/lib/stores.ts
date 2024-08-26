import { getContext, setContext } from "svelte";
import { writable } from "svelte/store";
import type { Serializer } from "svelte-persisted-store";
import type { Tab } from "./types";

export const plainTextSerializer: Serializer<string> = {
	parse: (text: string): string => {
		return text;
	},
	stringify: (object: string): string => {
		return object;
	}
};

const tabStateKey = Symbol("tabState");

export function initTabState() {
	const tabState = writable<Tab>("svelte");
	return setContext(tabStateKey, tabState);
}

export function getTabState() {
	return getContext<ReturnType<typeof initTabState>>(tabStateKey);
}
