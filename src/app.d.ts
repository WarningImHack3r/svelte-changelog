// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { ResolvedPathname } from "$app/types";
import type { PostHog } from "posthog-node";

declare global {
	namespace App {
		interface Error {
			/**
			 * A description, going in pair with a custom message.
			 * When provided, the error code is shown much more subtly
			 * and the description is shown where the title used to be.
			 */
			description?: string;
			/**
			 * A link to suggest going to in a button on the error page.
			 * Internal links must be `resolve`d for safety purposes, while
			 * external links can also be provided.
			 */
			link?: {
				text: string;
				href: ResolvedPathname | `https://${string}`;
			};
		}
		interface Locals {
			posthog: PostHog;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
