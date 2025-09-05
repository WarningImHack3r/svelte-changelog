import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import svelte from "eslint-plugin-svelte";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default defineConfig(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	svelte.configs.recommended,
	prettierConfig,
	svelte.configs.prettier,
	{
		languageOptions: {
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
			"svelte/no-unused-props": ["error", { allowUnusedNestedProperties: true }],
			"@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }]
		}
	},
	globalIgnores([
		"build/",
		".svelte-kit/",
		"dist/",
		"src/lib/components/ui/",
		"src/lib/utils.[jt]s"
	])
);
