import e18e from "@e18e/eslint-plugin";
import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import svelte from "eslint-plugin-svelte";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.ts";

export default defineConfig(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	prettierConfig,
	svelte.configs.prettier,
	e18e.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true
			},
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.js", "**/*.svelte.ts"],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: [".svelte"],
				projectService: true,
				svelteConfig
			}
		}
	},
	{
		rules: {
			// Added rules
			eqeqeq: ["error", "smart"],
			// Tweaked rules (already included above, but configured here)
			"svelte/no-unused-props": ["error", { allowUnusedNestedProperties: true }], // don't flag unused nested Svelte props
			"@typescript-eslint/no-unused-vars": [
				"error",
				// lax no-unused-vars to follow what TS does
				// copied from: https://typescript-eslint.io/rules/no-unused-vars/#what-benefits-does-this-rule-have-over-typescript
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true
				}
			],
			"@typescript-eslint/consistent-type-definitions": "off", // stylistic rule to be consistent between `type` or `interface`, unwanted
			"@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: true }], // stylistic rule, smarter on primitives
			// everything below is enabled by type-checked linting, but disabled because it's not smart enough to use Svelte's
			// zero-effort type-safety nor snippets rendering
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-redundant-type-constituents": "off", // would've been nice to have :(
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unnecessary-type-arguments": "off", // almost always wrong on runes for some reason
			"@typescript-eslint/no-useless-default-assignment": "off", // breaks with $bindable()
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allow: [{ name: ["Error", "URL", "URLSearchParams"], from: "lib" }],
					allowAny: true, // won't happen, but necessary
					allowBoolean: true,
					allowNullish: false, // only one tweaked
					allowNumber: true,
					allowRegExp: true
				}
			]
		}
	},
	{
		files: ["*.config.[jt]s"],
		extends: [tseslint.configs.disableTypeChecked]
	},
	globalIgnores([
		"build/",
		".svelte-kit/",
		"dist/",
		"src/lib/components/ui/",
		"src/lib/utils.[jt]s"
	])
);
