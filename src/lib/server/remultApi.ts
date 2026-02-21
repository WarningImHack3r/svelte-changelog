import { dev } from "$app/environment";
import Database from "better-sqlite3";
import { SqlDatabase } from "remult";
import { BetterSqlite3DataProvider } from "remult/remult-better-sqlite3";
import { remultApi } from "remult/remult-sveltekit";
import { CacheEntry } from "./db/CacheEntry";

export const api = remultApi({
	dataProvider: new SqlDatabase(new BetterSqlite3DataProvider(new Database("./db.sqlite"))),
	entities: [CacheEntry],
	admin: dev
});
