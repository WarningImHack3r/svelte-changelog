import { Entity, Fields } from "remult";
import { dev } from "$app/environment";

@Entity<CacheEntry>("cache-entries", {
	allowApiCrud: dev,
	id: "key"
})
export class CacheEntry {
	@Fields.string()
	key = "";

	@Fields.json()
	value = {} as unknown;

	@Fields.string()
	etag = "";

	@Fields.date({ allowNull: true })
	expiresAt: Date | null = null;

	@Fields.createdAt()
	createdAt = new Date();
}
