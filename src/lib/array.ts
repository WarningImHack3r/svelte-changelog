/**
 * A utility function to only keep unique items in
 * an array, based on the uniqTransform parameter.
 *
 * @param arr the input array
 * @param uniqTransform the transformation function
 * to make items unique
 * @returns the filtered array, containing only unique items
 *
 * @see {@link https://stackoverflow.com/a/70503699/12070367|Original implementation}
 */
export function uniq<T, U>(arr: T[], uniqTransform: (item: T) => U) {
	const track = new Set<U>();
	return arr.filter(item => {
		const value = uniqTransform(item);
		return track.has(value) ? false : track.add(value);
	});
}
