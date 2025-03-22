import type { Serializer } from "svelte-persisted-store";

export const plainTextSerializer: Serializer<string> = {
	parse: (text: string): string => {
		return text;
	},
	stringify: (object: string): string => {
		return object;
	}
};
