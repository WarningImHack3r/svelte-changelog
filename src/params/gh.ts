export function match(param) {
	const matches = param.replace(/^https?:\/\//, "") === "github.com";
	console.log(`${param} matches? ${matches}.`);
	return matches;
}
