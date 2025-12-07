import { browser } from "$app/environment";
import posthog from "posthog-js";
import { type LanguageRegistration, type ShikiTransformer, isPlainLang } from "shiki";
import { ddebug } from "$lib/debug";

/**
 * Pre-load the languages by returning regular expressions from language
 * registrations.
 *
 * @param languages a set of languages and their associated registrations.
 *        Languages must be sorted from the least to the most weighted.
 * @returns a set of languages and their associated regular expressions to test code against.
 */
export function loadLanguages(
	languages: Record<string, LanguageRegistration[]>
): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(languages).map(([language, registrations]) => {
			const regexps: string[] = [];
			for (const registration of registrations) {
				const patterns = registration.patterns;
				const visitedIncludes = new Set<string>();
				for (const pattern of patterns) {
					// Pattern with #include
					if (pattern.include) {
						if (visitedIncludes.has(pattern.include)) continue;
						visitedIncludes.add(pattern.include);
						const repoValue = registration.repository[pattern.include.slice(1)];
						if (repoValue) {
							if (repoValue.match) regexps.push(repoValue.match.toString());
							if (repoValue.begin) regexps.push(repoValue.begin.toString());
							if (repoValue.end) regexps.push(repoValue.end.toString());
							if (repoValue.patterns) patterns.push(...repoValue.patterns);
						}
						continue;
					}
					// Custom pattern
					if (pattern.match) regexps.push(pattern.match.toString());
					if (pattern.begin) regexps.push(pattern.begin.toString());
					if (pattern.end) regexps.push(pattern.end.toString());
				}
			}
			return [language, regexps];
		})
	);
}

/**
 * Detects the programming or markup language based on the given code snippet.
 *
 * @param code the code snippet to analyze and detect the language from.
 * @param languages the pre-loaded languages and their associated regexps.
 * @returns The detected language as a string, or undefined if no language
 * could be determined.
 */
export function detectLanguage(
	code: string,
	languages: Record<string, string[]>
): string | undefined {
	let languageCandidate: string | undefined = undefined;
	let highestRate = 0;
	let highestTotal = 0;

	const trimmed = code.trim();
	if (!trimmed) return languageCandidate;

	ddebug("===== Starting determining language for:");
	ddebug(code);
	ddebug("=====");

	// try detecting language based off of first line comment
	const firstLine = trimmed.split("\n").shift()?.trim();
	if (firstLine) {
		const isComment =
			(firstLine.startsWith("//") || firstLine.startsWith("#")) && !firstLine.includes(" ");
		if (isComment) {
			ddebug(`First line comment: ${firstLine}`);
			const firstSplit = firstLine.split(".");
			if (firstSplit.length) {
				const extension = firstSplit.pop();
				if (extension && Object.keys(languages).includes(extension)) {
					ddebug(`Found valid language from first comment: ${extension}`);
					return extension;
				}
			}
		}
	}

	// otherwise, loop over regexes
	for (const [language, regexps] of Object.entries(languages)) {
		if (!regexps.length) continue;
		const compute = regexps.map<{ matches: boolean; count: number }>(regexp => {
			try {
				const match = code.match(regexp);
				return { matches: !!match, count: match?.length ?? 0 };
			} catch {
				return { matches: false, count: 0 };
			}
		});
		const matchesLength = compute.reduce((acc, item) => acc + item.count, 0);
		const matchesCount = compute.filter(item => item.matches).length;
		const successRate = matchesLength / matchesCount;
		ddebug(
			`[${language}]\t${matchesLength} on ${matchesCount} regexes matches over ${regexps.length} regexes - success rate: ${Math.round((successRate * 100 + Number.EPSILON) * 100) / 100}%`
		);
		if (
			successRate > highestRate ||
			(successRate === highestRate && regexps.length > highestTotal)
		) {
			ddebug(
				`New candidate found! Previous values: ${languageCandidate} - highest rate ${highestRate}, highest total regexes: ${highestTotal}`
			);
			languageCandidate = language;
			highestRate = successRate;
			highestTotal = regexps.length;
		}
	}
	ddebug(`Done: result is ${languageCandidate}`);
	return languageCandidate;
}

/**
 * A transformer that trims unnecessary whitespace at the beginning and end of the string.
 */
export const transformerTrimCode: ShikiTransformer = {
	preprocess(code) {
		return code.replace(/(^\r?\n|\r?\n$)/g, "");
	}
};

/**
 * A Shiki transformer used for language detection and setting the appropriate language metadata
 * in code blocks. Useful for handling code snippets with "diff" language and converting them
 * to a detected programming language.
 */
export function transformerLanguageDetection(
	languages: Record<string, string[]>
): ShikiTransformer {
	return {
		preprocess(code, options) {
			if (options.lang === "diff") {
				// tests:
				// - /issues/sveltejs/svelte/14280
				const cleanedCode = code
					.split("\n")
					.map(line => line.replace(/^[+-]/, ""))
					.join("\n");
				const detectedLanguage = detectLanguage(cleanedCode, languages);
				if (!detectedLanguage) {
					if (browser)
						posthog.captureException(new Error("Failed to determine diff language"), {
							code
						});
					return;
				}
				options.lang = detectedLanguage;
				if (options.meta) options.meta["data-detected"] = true;
			} else if (isPlainLang(options.lang)) {
				// tests:
				// - /issues/sveltejs/svelte/16072
				const detectedLanguage = detectLanguage(code, languages);
				if (detectedLanguage) {
					options.lang = detectedLanguage;
					if (options.meta) options.meta["data-detected"] = true;
				}
			}
			return code;
		},
		pre(node) {
			node.properties["data-language"] = this.options.lang
				.toLowerCase()
				.replace(/^js$/, "javascript")
				.replace(/^ts$/, "typescript");
		}
	};
}

/**
 * Replicate the behavior of Shiki's `transformerNotationDiff`,
 * but in-house and without needing any code transformation.
 *
 * @see https://shiki.style/packages/transformers#transformernotationdiff
 */
export const transformerDiffMarking: ShikiTransformer = {
	pre(node) {
		const isDiff = this.tokens.some(line => {
			return line.some(token => {
				if (token.offset > 0) return false;
				const content = token.content.trim();
				return content === "+" || content === "-";
			});
		});
		if (isDiff) this.addClassToHast(node, "has-diff");
	},
	line(node) {
		const firstChild = node.children[0];
		if (!firstChild || firstChild.type !== "element") return;
		const firstToken = firstChild.children[0];
		if (!firstToken || firstToken.type !== "text") return;
		if (firstToken.value.startsWith("+")) {
			this.addClassToHast(node, ["diff", "add"]);
			if (firstToken.value.length === 1) {
				node.children.shift();
			} else {
				firstToken.value = firstToken.value.slice(1);
			}
		} else if (firstToken.value.startsWith("-")) {
			this.addClassToHast(node, ["diff", "remove"]);
			if (firstToken.value.length === 1) {
				node.children.shift();
			} else {
				firstToken.value = firstToken.value.slice(1);
			}
		}
	}
};
