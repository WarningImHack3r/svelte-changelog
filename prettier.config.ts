import type { PluginConfig as SortImports } from "@trivago/prettier-plugin-sort-imports";
import type { Config as Prettier } from "prettier";
import type { PluginOptions as Tailwind } from "prettier-plugin-tailwindcss";

type Config = Prettier & Tailwind & SortImports;

/**
 * @see https://prettier.io/docs/configuration
 */
const config: Config = {
	useTabs: true,
	trailingComma: "none",
	printWidth: 100,
	arrowParens: "avoid",
	plugins: [
		"prettier-plugin-svelte",
		"@trivago/prettier-plugin-sort-imports",
		"prettier-plugin-tailwindcss"
	],
	overrides: [
		{
			files: "*.svelte",
			options: {
				parser: "svelte"
			}
		}
	],
	tailwindStylesheet: "./src/app.css",
	importOrder: [
		"^\\.\\./app.css$",
		"^svelte$",
		"^svelte/.*$",
		"^@sveltejs/kit.*$",
		"^@sveltejs/.*$",
		"\\$(app|env)/.+$",
		"<THIRD_PARTY_MODULES>",
		"#lib/(?!components).+$",
		"#lib/components/ui/.+$",
		"#lib/components/.+$",
		"^\\.*/.+$"
	],
	importOrderSortSpecifiers: true
};

export default config;
