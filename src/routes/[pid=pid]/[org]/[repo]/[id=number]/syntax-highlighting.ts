import { browser } from "$app/environment";
import posthog from "posthog-js";
import type { LanguageRegistration, ShikiTransformer } from "shiki";

/**
 * Pre-load the languages by returning regular expressions from language
 * registrations.
 *
 * @param languages a set of languages and their associated registrations.
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

	for (const [language, regexps] of Object.entries(languages)) {
		if (!regexps.length) continue;
		const matchesCount = regexps
			.map(regexp => {
				try {
					return code.match(regexp)?.length ?? 0;
				} catch {
					return 0;
				}
			})
			.reduce((acc, b) => acc + b, 0);
		const successRate = matchesCount / regexps.length;
		if (
			successRate > highestRate ||
			(successRate === highestRate && regexps.length > highestTotal)
		) {
			languageCandidate = language;
			highestRate = successRate;
			highestTotal = regexps.length;
		}
	}
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
				return code;
			}
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
