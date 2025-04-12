import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";
import svelteConfig from "./svelte.config.js";

export default tseslint.config(
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
	{
		ignores: ["build/", ".svelte-kit/", "dist/", "src/lib/components/ui/", "src/lib/utils.[jt]s"]
	}
);
