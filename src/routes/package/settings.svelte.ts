import { createContext } from "svelte";
import { PersistedState } from "runed";
import type { PackageSettings } from "$lib/types";

const DEFAULT_SETTINGS: PackageSettings = {
	showPrereleases: true,
	releasesType: "all"
};

export class SettingsUtils {
	static hasChanged(settings: PackageSettings) {
		return (
			settings.showPrereleases !== DEFAULT_SETTINGS.showPrereleases ||
			settings.releasesType !== DEFAULT_SETTINGS.releasesType
		);
	}

	static modificationString(settings: PackageSettings) {
		const result = [];
		if (settings.showPrereleases !== DEFAULT_SETTINGS.showPrereleases) {
			result.push("prereleases are hidden");
		}
		if (settings.releasesType !== DEFAULT_SETTINGS.releasesType) {
			result.push(`only the ${settings.releasesType} releases are shown`);
		}
		return result
			.filter(Boolean)
			.map(item => `- ${item}`)
			.join("\n");
	}
}

class PackagesSettings {
	#settingsMap = new Map<string, PersistedState<PackageSettings>>();

	get(packageName: string) {
		const key = `${packageName.toLowerCase().replace(/ /g, "-")}-settings`;
		let defaultSettings = DEFAULT_SETTINGS;
		const storedValue = this.#settingsMap.get(packageName);
		if (storedValue) {
			let skip = false;
			for (const k of Object.keys(DEFAULT_SETTINGS)) {
				if (!(k in storedValue.current)) {
					defaultSettings = { ...DEFAULT_SETTINGS, ...storedValue.current };
					localStorage.removeItem(key);
					skip = true;
					break;
				}
			}
			if (!skip) return storedValue;
		}
		const newState = new PersistedState(key, defaultSettings);
		this.#settingsMap.set(packageName, newState);
		return newState;
	}
}

const [getPackageSettings, setPackageSettings] = createContext<PackagesSettings>();

export function initPackageSettings() {
	return setPackageSettings(new PackagesSettings());
}
export { getPackageSettings };
