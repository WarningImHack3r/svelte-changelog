// (Adjusted) types of old functions implemented by Safari in 16.4 then removed
// Source: https://2ality.com/2022/01/array-grouping.html#grouping-arrays

type ArrayGroupFn<T, K extends PropertyKey> = (
	callback: (value: T, index: number, array: T[]) => K,
	thisArg?: unknown
) => { [k in K]: T[] };

type ArrayGroupToMapFn<T, K> = (
	callback: (value: T, index: number, array: T[]) => K,
	thisArg?: unknown
) => Map<K, T[]>;

export function groupBy<K extends PropertyKey, T>(
	items: Iterable<T>,
	keySelector: (item: T, index: number, array?: T[]) => K
): Partial<Record<K, T[]>> {
	if (typeof Object.groupBy === "function") {
		return Object.groupBy(items, keySelector);
	}

	const arr = [...items];

	const arrAsRecord = Array.prototype as unknown as Record<string, unknown>;

	if (typeof arrAsRecord.group === "function") {
		const groupFn = arrAsRecord.group as ArrayGroupFn<T, K>;
		return groupFn.call(arr, keySelector);
	}

	if (typeof arrAsRecord.groupToMap === "function") {
		const groupToMapFn = arrAsRecord.groupToMap as ArrayGroupToMapFn<T, K>;
		return Object.fromEntries(
			groupToMapFn.call(arr, keySelector)
		) as /* cast to partial, this just causes an additional null check "for nothing" */ ReturnType<
			typeof Object.groupBy<K, T>
		>;
	}

	return arr.reduce<Partial<Record<K, T[]>>>((acc, item, index) => {
		const key = keySelector(item, index, arr);
		(acc[key] ??= []).push(item);
		return acc;
	}, {});
}
