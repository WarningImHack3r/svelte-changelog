type Primitive = string | null | symbol | boolean | number | undefined | bigint;

function isPrimitive(val: unknown): val is Primitive {
	return val !== Object(val) || val === null;
}

/**
 * A `localStorage` wrapper, runes edition.
 *
 * @param key the `localStorage` key to use
 * @param initial the initial value if it doesn't already exist in `localStorage`
 * @returns the (one-way) rune, updating `localStorage` on change
 *
 * @see {@link https://x.com/puruvjdev/status/1787037268143689894/photo/1|Original idea}
 */
export function persisted<T>(key: string, initial: T) {
	const existing = localStorage.getItem(key);

	const primitive = isPrimitive(initial);
	const parsedValue = existing ? (JSON.parse(existing) as T) : initial;

	const state = $state<T extends Primitive ? { value: T } : T>(
		// @ts-expect-error type conflict between object version and raw version
		primitive ? { value: parsedValue } : parsedValue
	);

	$effect.root(() => {
		$effect(() => {
			localStorage.setItem(key, JSON.stringify(primitive ? (state as { value: T }).value : state));
		});
	});

	return state;
}
