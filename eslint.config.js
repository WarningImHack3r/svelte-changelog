import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import globals from "globals";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		},
		rules: {
			// Prefer `{ myFunction: () => {} }` over `{ myFunction() {} }`
			// https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
			"@typescript-eslint/method-signature-style": ["error", "property"],
			// Force the use of `import type { A }` over `import { type A }`
			// https://typescript-eslint.io/rules/no-import-type-side-effects/
			"@typescript-eslint/no-import-type-side-effects": "error"
		}
	},
	{
		ignores: [
			"build/",
			".svelte-kit/",
			"package/",
			"vite.config.[jt]s.timestamp-*",
			"src/lib/components/ui/",
			"src/lib/utils.[jt]s"
		]
	}
];
