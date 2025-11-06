// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { PostHog } from "posthog-node";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			posthog: PostHog;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
