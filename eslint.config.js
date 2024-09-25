import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettierConfig,
	...svelte.configs["flat/prettier"],
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
				parser: tseslint.parser
			}
		}
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/", "src/lib/components/ui/", "src/lib/utils.[jt]s"]
	}
);
