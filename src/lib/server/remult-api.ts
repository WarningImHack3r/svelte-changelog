import { dev } from "$app/environment";
import { createPostgresDataProvider } from "remult/postgres";
import { remultApi } from "remult/remult-sveltekit";
import { CacheEntry } from "./db/CacheEntry";

export const api = remultApi({
	dataProvider: createPostgresDataProvider(), // uses the DATABASE_URL env var by default for the remote URL
	entities: [CacheEntry],
	admin: dev
});
