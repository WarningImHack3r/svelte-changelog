import { getContext, setContext } from "svelte";
import { PersistedState } from "runed";
import type { PackageSettings } from "$lib/types";

const settingsKey = Symbol("settings");

const DEFAULT_SETTINGS: PackageSettings = {
	showPrereleases: true
};

class PackagesSettings {
	#settingsMap = new Map<string, PersistedState<PackageSettings>>();

	get(packageName: string) {
		const storedValue = this.#settingsMap.get(packageName);
		if (storedValue) return storedValue;
		const newState = new PersistedState(
			`${packageName.toLowerCase().replace(/ /g, "-")}-settings`,
			DEFAULT_SETTINGS
		);
		this.#settingsMap.set(packageName, newState);
		return newState;
	}
}

export function initPackageSettings() {
	return setContext(settingsKey, new PackagesSettings());
}

export function getPackageSettings() {
	return getContext<ReturnType<typeof initPackageSettings>>(settingsKey);
}
