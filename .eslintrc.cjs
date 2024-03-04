/** @type { import("eslint").Linter.Config } */
module.exports = {
	root: true,
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
		"prettier"
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020,
		extraFileExtensions: [".svelte"]
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",
			parserOptions: {
				parser: "@typescript-eslint/parser"
			}
		}
	],
	rules: {
		// Prefer `{ myFunction: () => {} }` over `{ myFunction() {} }`
		// https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
		"@typescript-eslint/method-signature-style": ["error", "property"],
		// Force the use of `import type { A }` over `import { type A }`
		// https://typescript-eslint.io/rules/no-import-type-side-effects/
		"@typescript-eslint/no-import-type-side-effects": "error"
	}
};
