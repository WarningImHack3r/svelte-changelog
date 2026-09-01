const durationRegex = /(\d+)([A-Za-z])/g;
const unitToSeconds: Record<string, number> = {
	y: 12 * 30 * 24 * 60 * 60,
	m: 30 * 24 * 60 * 60,
	w: 7 * 24 * 60 * 60,
	d: 24 * 60 * 60,
	h: 60 * 60
};
function parseQueryParamDuration(param: string): Date | undefined {
	durationRegex.lastIndex = 0; // "reset" the regex consumption as global regex are stateful!!
	if (!param || !durationRegex.test(param)) return undefined;
	durationRegex.lastIndex = 0;

	const resetValues: typeof unitToSeconds = {};
	for (const [, num, unit] of param.matchAll(durationRegex) ?? []) {
		if (!num || !+num || !unit) continue;
		resetValues[unit] = +num; // ensure the last gets used with duplicates
	}

	let targetDate = Date.now();
	for (const [unit, num] of Object.entries(resetValues)) {
		const secs = unitToSeconds[unit.toLowerCase()];
		if (!secs) continue;
		targetDate -= num * secs * 1_000;
	}
	return new Date(targetDate);
}

export function computeSearchParams(url: URL) {
	return {
		resetDate: parseQueryParamDuration(url.searchParams.get("reset") ?? "")
	};
}
