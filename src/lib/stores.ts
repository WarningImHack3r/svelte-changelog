import { getContext, setContext } from "svelte";
import { writable } from "svelte/store";
import type { Settings, Tab } from "../types";
import { localStorageStore } from "./localStorageStore";

const tabStateKey = Symbol("tabState");
const settingsKey = Symbol("settings");

export function initTabState() {
	const tabState = writable<Tab>("svelte");
	return setContext(tabStateKey, tabState);
}

export function getTabState() {
	return getContext<ReturnType<typeof initTabState>>(tabStateKey);
}

export function initSettings() {
	const settings = localStorageStore<Settings>("settings", {});
	return setContext(settingsKey, settings);
}

export function getSettings() {
	return getContext<ReturnType<typeof initSettings>>(settingsKey);
}
