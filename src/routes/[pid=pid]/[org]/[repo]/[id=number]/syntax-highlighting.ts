import { browser } from "$app/environment";
import posthog from "posthog-js";
import type { ShikiTransformer, SpecialLanguage } from "shiki";

/**
 * Detects the programming or markup language based on the given code snippet.
 *
 * @param code the code snippet to analyze and detect the language from.
 * @returns The detected language as a string, or undefined if no language
 * could be determined.
 */
export function detectLanguage(code: string): (SpecialLanguage | (string & {})) | undefined {
	const match = code
		.split("\n", 1)[0]
		?.trim()
		?.match(/^(?:\/\/|#) ?[^ !]+?\.([A-Za-z0-9]{1,10})$/);
	if (match) return match[1];

	const hasHTML = /<\/[a-zA-Z0-9-]+>/.test(code);
	const hasJS = / (let|var|const|=|\/\/) /.test(code);

	if (hasHTML && hasJS) return "svelte";
	if (hasHTML) return "html";
	if (hasJS) return /(: [A-Z]|type |interface )/.test(code) ? "ts" : "js";
	if (/[a-z-]+: \S+/.test(code)) return "css";
}

/**
 * A Shiki transformer used for language detection and setting the appropriate language metadata
 * in code blocks. Useful for handling code snippets with "diff" language and converting them
 * to a detected programming language.
 */
export const transformerLanguageDetection: ShikiTransformer = {
	preprocess(code, options) {
		if (options.lang === "diff") {
			const cleanedCode = code
				.split("\n")
				.map(line => line.replace(/^[+-]/, ""))
				.join("\n");
			const detectedLanguage = detectLanguage(cleanedCode);
			if (!detectedLanguage) {
				if (browser)
					posthog.captureException(new Error("Failed to determine diff language"), {
						code
					});
				return;
			}
			options.lang = detectedLanguage;
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
