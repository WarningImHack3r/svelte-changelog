const numberRegex = /^\d+$/;

export function match(value) {
	return numberRegex.test(value);
}
