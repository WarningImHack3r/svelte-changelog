import type { Entries } from "./types";

/**
 * Decodes a base64 string to a UTF-8 string
 * Source: https://stackoverflow.com/a/64752311/12070367
 * @param base64 The base64 string to decode
 */
export function decodeBase64(base64: string) {
	const text = atob(base64);
	const length = text.length;
	const bytes = new Uint8Array(length);
	for (let i = 0; i < length; i++) {
		bytes[i] = text.charCodeAt(i);
	}
	const decoder = new TextDecoder(); // default is utf-8
	return decoder.decode(bytes);
}

/**
 * Converts a date to a relative date string.
 * e.g., "2 days ago", "3 hours ago", "1 minute ago"
 *
 * @param date The date to convert
 */
export function toRelativeDateString(date: Date) {
	let dateDiff = new Date().getTime() - date.getTime();
	let relevantUnit: Intl.RelativeTimeFormatUnit;
	switch (true) {
		case dateDiff < 1000 * 60:
			dateDiff /= 1000;
			relevantUnit = "seconds";
			break;
		case dateDiff < 1000 * 60 * 60:
			dateDiff /= 1000 * 60;
			relevantUnit = "minutes";
			break;
		case dateDiff < 1000 * 60 * 60 * 24:
			dateDiff /= 1000 * 60 * 60;
			relevantUnit = "hours";
			break;
		default:
			dateDiff /= 1000 * 60 * 60 * 24;
			relevantUnit = "days";
			break;
	}
	return new Intl.RelativeTimeFormat("en", {
		style: "long"
	}).format(-Math.ceil(dateDiff), relevantUnit);
}

/**
 * An `Object.entries` wrapper that retains the object's type.
 * Source: https://stackoverflow.com/a/74823834/12070367
 *
 * @param obj The object to get entries from
 */
export function typedEntries<T extends object>(obj: T) {
	return Object.entries(obj) as Entries<T>;
}
