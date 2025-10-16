import { createContext } from "svelte";
import { PersistedState } from "runed";
import type { PackageSettings } from "$lib/types";

export const DEFAULT_SETTINGS: PackageSettings = {
	showPrereleases: true,
	releasesType: "all"
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

const [getPackageSettings, setPackageSettings] = createContext<PackagesSettings>();

export function initPackageSettings() {
	return setPackageSettings(new PackagesSettings());
}
export { getPackageSettings };
