import { definePageMetaTags } from "svelte-meta-tags";

const durationRegex = /(\d+)([A-Za-z])/g;
const unitToSeconds: Record<string, number> = {
	y: 12 * 30 * 24 * 60 * 60,
	m: 30 * 24 * 60 * 60,
	w: 7 * 24 * 60 * 60,
	d: 24 * 60 * 60,
	h: 60 * 60
};
function parseQueryParamDuration(param: string): Date | undefined {
	durationRegex.lastIndex = 0; // "reset" the regex consumption as global regexp are stateful!!
	if (!param || !durationRegex.test(param)) return undefined;
	durationRegex.lastIndex = 0;

	const resetValues: typeof unitToSeconds = {};
	for (const [, num, unit] of param.matchAll(durationRegex) ?? []) {
		if (!num || !+num || !unit) continue;
		resetValues[unit] = +num; // ensure last get used with dups
	}

	let targetDate = Date.now();
	for (const [unit, num] of Object.entries(resetValues)) {
		const secs = unitToSeconds[unit.toLowerCase()];
		if (!secs) continue;
		targetDate -= num * secs * 1_000;
	}
	return new Date(targetDate);
}

export function load({ data, url }) {
	return {
		...data,
		resetDate: parseQueryParamDuration(url.searchParams.get("reset") ?? ""),
		...definePageMetaTags({
			title: data.currentPackage.pkg.name,
			openGraph: {
				images: [
					{
						get url() {
							const ogUrl = new URL("og", url.origin);
							ogUrl.searchParams.set("title", data.currentPackage.pkg.name);
							ogUrl.searchParams.set(
								"description",
								`${data.currentPackage.repoOwner}/${data.currentPackage.repoName}`
							);
							return ogUrl.href;
						}
					}
				]
			},
			twitter: {
				cardType: "summary_large_image"
			}
		})
	};
}
