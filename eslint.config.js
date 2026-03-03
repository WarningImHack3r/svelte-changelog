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
	tseslint.configs.strict,
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
			// added rules
			eqeqeq: ["error", "smart"],
			// tweaked rules (already included above, but configured here)
			"svelte/no-unused-props": ["error", { allowUnusedNestedProperties: true }],
			"@typescript-eslint/no-unused-vars": [
				"error",
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
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: true }]
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
